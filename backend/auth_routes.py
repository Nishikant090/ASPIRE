"""
auth_routes.py - Production auth: registration, email verification, login, session management
College email only for student authentication. One-time email verification at registration.
"""

import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import auth_models as am
import models
import schemas
from audit_utils import log_audit
from auth import (
    clear_refresh_cookie,
    get_current_user,
    hash_password,
    issue_auth_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_otp_record,
    verify_password,
    verify_refresh_token,
)
from auth_utils import (
    OTP_PURPOSE_EMAIL,
    check_account_lockout,
    cleanup_expired_pending_company,
    cleanup_expired_pending_student,
    delete_pending_student,
    get_latest_otp_record,
    get_resend_cooldown_seconds,
    normalize_email,
    record_failed_login,
    reset_login_attempts,
    send_verification_otp as dispatch_verification_otp,
    verification_deadline,
)
from config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    COOKIE_NAME,
    FRONTEND_URL,
    OTP_RESEND_COOLDOWN_SECONDS,
    PENDING_VERIFICATION_EXPIRE_HOURS,
)
from database import get_db
from email_service import send_verification_complete_email
from rate_limit import check_rate_limit

router = APIRouter(prefix="/auth", tags=["Auth"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_auth(request: Request, key: str, max_requests: int = 10, window: int = 300):
    allowed, msg = check_rate_limit(f"{key}:{_client_ip(request)}", max_requests, window)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)


def _generate_username(db: Session, email: str, preferred: Optional[str] = None) -> str:
    base = (preferred or email.split("@")[0]).lower()
    base = re.sub(r"[^a-z0-9_]", "", base) or "student"
    candidate = base
    suffix = 1
    while db.query(models.Student).filter(models.Student.username == candidate).first():
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate


def _student_to_out(student: models.Student) -> schemas.StudentOut:
    return schemas.StudentOut(
        id=student.id,
        full_name=student.full_name,
        username=student.username,
        college_email=student.college_email,
        college_name=student.college_name,
        name=student.full_name,
        email=student.college_email,
        college=student.college_name,
        branch=student.branch or "",
        year=student.graduation_year or student.year or "",
        semester=student.semester,
        graduation_year=student.graduation_year,
        roll_number=student.roll_number,
        linkedin_url=student.linkedin_url,
        github_url=student.github_url,
        portfolio_url=student.portfolio_url,
        resume_path=student.resume_path,
        profile_picture=student.profile_picture,
        skills=student.skills or "",
        tnp_head_name=student.tnp_head_name,
        tnp_head_phone=student.tnp_head_phone,
        is_email_verified=student.is_college_email_verified,
        is_college_email_verified=student.is_college_email_verified,
        is_verified=student.is_verified,
        status=student.status,
        created_at=student.created_at,
    )


def _verification_status_payload(db: Session, student: models.Student) -> schemas.VerificationStatusOut:
    otp_record = get_latest_otp_record(db, student.college_email, OTP_PURPOSE_EMAIL)
    cooldown = get_resend_cooldown_seconds(
        otp_record.created_at if otp_record else None,
        OTP_RESEND_COOLDOWN_SECONDS,
    )
    is_expired = bool(
        student.verification_expires_at
        and student.verification_expires_at < datetime.utcnow()
    )
    return schemas.VerificationStatusOut(
        student_id=student.id,
        college_email=student.college_email,
        is_college_email_verified=student.is_college_email_verified,
        is_fully_verified=student.is_fully_verified,
        status=student.status,
        verification_expires_at=student.verification_expires_at,
        is_expired=is_expired,
        resend_cooldown_seconds=cooldown,
        can_resend=cooldown == 0,
    )


def _company_verification_status_payload(db: Session, company) -> schemas.CompanyVerificationStatusOut:
    otp_record = get_latest_otp_record(db, company.email, OTP_PURPOSE_EMAIL)
    cooldown = get_resend_cooldown_seconds(
        otp_record.created_at if otp_record else None,
        OTP_RESEND_COOLDOWN_SECONDS,
    )
    is_expired = bool(
        company.verification_expires_at
        and company.verification_expires_at < datetime.utcnow()
    )
    return schemas.CompanyVerificationStatusOut(
        company_id=company.id,
        email=company.email,
        is_email_verified=company.is_email_verified,
        status=company.status.value,
        verification_expires_at=company.verification_expires_at,
        is_expired=is_expired,
        resend_cooldown_seconds=cooldown,
        can_resend=cooldown == 0,
    )


def _activate_student_if_verified(student: models.Student, db: Session):
    if student.is_college_email_verified:
        student.is_email_verified = True
        student.status = models.StudentStatus.active
        student.verification_expires_at = None
        db.commit()
        db.refresh(student)
        try:
            send_verification_complete_email(student.college_email, student.full_name)
        except Exception as e:
            print(f"[Email] Verification complete notification failed: {e}")


def _send_student_verification_otp(db: Session, student: models.Student) -> dict:
    return dispatch_verification_otp(db, student.college_email, am.UserType.student, student.full_name)


def _send_company_verification_otp(db: Session, company) -> dict:
    return dispatch_verification_otp(db, company.email, am.UserType.company, company.name)


def _get_student_by_email(db: Session, email: str):
    normalized = normalize_email(email)
    student = db.query(models.Student).filter(
        models.Student.college_email == normalized
    ).first()
    return cleanup_expired_pending_student(db, student)


@router.post("/register", response_model=schemas.RegisterOut, status_code=status.HTTP_201_CREATED)
def register_student(
    data: schemas.StudentRegister,
    request: Request,
    db: Session = Depends(get_db),
):
    """One-time student registration. Email verification required before login."""
    college_email = normalize_email(str(data.college_email))
    _rate_limit_auth(request, f"register:{college_email}", max_requests=5, window=3600)

    existing = _get_student_by_email(db, college_email)
    if existing:
        if existing.is_fully_verified:
            raise HTTPException(
                status_code=409,
                detail="Email already registered. Please log in.",
            )
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Registration already in progress. Complete email verification to activate your account.",
                "code": "VERIFICATION_PENDING",
                "student_id": existing.id,
            },
        )

    username = _generate_username(db, college_email, data.username)
    grad_year = data.graduation_year or data.year or ""
    expires_at = verification_deadline()

    student = models.Student(
        full_name=data.full_name.strip(),
        username=username,
        personal_email=college_email,
        college_email=college_email,
        password_hash=hash_password(data.password),
        college_name=data.college_name.strip(),
        branch=data.branch or "",
        year=grad_year,
        graduation_year=grad_year or None,
        roll_number=data.roll_number,
        skills=data.skills or "",
        linkedin_url=data.linkedin_url,
        github_url=data.github_url,
        portfolio_url=data.portfolio_url,
        resume_path=data.resume_path,
        profile_picture=data.profile_picture,
        tnp_head_name=data.tnp_head_name.strip(),
        tnp_head_phone=data.tnp_head_phone.strip(),
        is_email_verified=False,
        is_college_email_verified=False,
        status=models.StudentStatus.pending,
        verification_expires_at=expires_at,
    )
    db.add(student)
    try:
        _send_student_verification_otp(db, student)
        db.commit()
        db.refresh(student)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email already registered. Please log in.",
        )
    except HTTPException as exc:
        db.rollback()
        raise exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed: Verification email could not be sent. Please try again later."
        )

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="registered",
    )

    success_message = (
        f"Registration successful. Verify your college email within "
        f"{PENDING_VERIFICATION_EXPIRE_HOURS} hours to activate your account."
    )
    return schemas.RegisterOut(
        message=success_message,
        student_id=student.id,
        college_email=student.college_email,
        verification_expires_at=expires_at,
    )


@router.get("/verification-status/{student_id}", response_model=schemas.VerificationStatusOut)
def get_verification_status(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student = cleanup_expired_pending_student(db, student)
    if not student:
        raise HTTPException(
            status_code=410,
            detail={
                "message": "Registration expired because email verification was not completed in time. Please register again.",
                "code": "VERIFICATION_EXPIRED",
            },
        )

    return _verification_status_payload(db, student)


@router.post("/verify-email/send")
def send_verification_otp(
    data: schemas.SendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Send OTP to college email for one-time verification."""
    email = normalize_email(str(data.email))
    _rate_limit_auth(request, f"verify-send:{email}", max_requests=3, window=3600)

    student = _get_student_by_email(db, email)
    if not student:
        raise HTTPException(status_code=404, detail="No registration found for this email")

    if student.is_college_email_verified:
        return {"message": "College email already verified"}

    return _send_student_verification_otp(db, student)


@router.post("/verify-email/confirm", response_model=schemas.VerificationStatusOut)
def confirm_verification_otp(
    data: schemas.ConfirmVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = normalize_email(str(data.email))
    _rate_limit_auth(request, f"verify-confirm:{email}", max_requests=10, window=900)

    student = _get_student_by_email(db, email)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.is_college_email_verified:
        return _verification_status_payload(db, student)

    record, error = verify_otp_record(db, email, OTP_PURPOSE_EMAIL, data.otp)
    if error == "expired":
        raise HTTPException(status_code=400, detail="Verification code has expired. Request a new code.")
    if error == "locked":
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new verification code.",
        )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    student.is_college_email_verified = True
    db.commit()
    db.refresh(student)
    _activate_student_if_verified(student, db)
    db.refresh(student)

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="verified_college_email",
    )

    return _verification_status_payload(db, student)


@router.post("/student/login", response_model=schemas.TokenOut)
def student_password_login(
    data: schemas.StudentLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Login with college email + password."""
    college_email = normalize_email(str(data.college_email))
    _rate_limit_auth(request, f"login:{college_email}", max_requests=15, window=900)

    student = _get_student_by_email(db, college_email)

    if student:
        check_account_lockout(student.locked_until)

    if not student or not verify_password(data.password, student.password_hash):
        if student:
            record_failed_login(db, student, actor_type="student", email=college_email)
            log_audit(
                db,
                actor_type="student",
                actor_id=student.id,
                actor_email=college_email,
                action="login_failed",
            )
        else:
            log_audit(
                db,
                actor_type="student",
                actor_email=college_email,
                action="login_failed",
                details="unknown_email",
            )
        raise HTTPException(status_code=401, detail="Invalid college email or password")

    if student.status == models.StudentStatus.blocked:
        raise HTTPException(status_code=403, detail="Account has been deactivated. Contact support.")
    if not student.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")
    if not student.is_fully_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Please complete email verification before logging in.",
                "code": "EMAIL_NOT_VERIFIED",
                "student_id": student.id,
            },
        )
    if student.status != models.StudentStatus.active:
        raise HTTPException(status_code=403, detail="Account is not active yet.")

    reset_login_attempts(db, student)

    access_token = issue_auth_tokens(
        response,
        db,
        role="student",
        user_id=student.id,
        access_payload={
            "sub": student.college_email,
            "role": "student",
            "student_id": student.id,
        },
    )

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="login",
    )

    return schemas.TokenOut(
        access_token=access_token,
        student_id=student.id,
        role="student",
        email=student.college_email,
    )


@router.get("/company/verification-status/{company_id}", response_model=schemas.CompanyVerificationStatusOut)
def get_company_verification_status(company_id: int, db: Session = Depends(get_db)):
    import company_models as cm

    company = db.query(cm.Company).filter(cm.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company = cleanup_expired_pending_company(db, company)
    if not company:
        raise HTTPException(
            status_code=410,
            detail={
                "message": "Registration expired because email verification was not completed in time. Please register again.",
                "code": "VERIFICATION_EXPIRED",
            },
        )

    return _company_verification_status_payload(db, company)


@router.post("/company/verify-email/send")
def send_company_verification_otp(
    data: schemas.SendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    import company_models as cm

    email = normalize_email(str(data.email))
    _rate_limit_auth(request, f"company-verify-send:{email}", max_requests=3, window=3600)

    company = db.query(cm.Company).filter(cm.Company.email == email).first()
    company = cleanup_expired_pending_company(db, company)
    if not company:
        raise HTTPException(status_code=404, detail="No registration found for this email")

    if company.is_email_verified:
        return {"message": "Company email already verified"}

    return _send_company_verification_otp(db, company)


@router.post("/company/verify-email/confirm", response_model=schemas.CompanyVerificationStatusOut)
def confirm_company_verification_otp(
    data: schemas.ConfirmVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    import company_models as cm

    email = normalize_email(str(data.email))
    _rate_limit_auth(request, f"company-verify-confirm:{email}", max_requests=10, window=900)

    company = db.query(cm.Company).filter(cm.Company.email == email).first()
    company = cleanup_expired_pending_company(db, company)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.is_email_verified:
        return _company_verification_status_payload(db, company)

    record, error = verify_otp_record(db, email, OTP_PURPOSE_EMAIL, data.otp)
    if error == "expired":
        raise HTTPException(status_code=400, detail="Verification code has expired. Request a new code.")
    if error == "locked":
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Request a new verification code.",
        )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    company.is_email_verified = True
    company.verification_expires_at = None
    db.commit()
    db.refresh(company)

    log_audit(
        db,
        actor_type="company",
        actor_id=company.id,
        actor_email=company.email,
        action="verified_email",
    )

    return _company_verification_status_payload(db, company)


@router.get("/me", response_model=schemas.AuthMeOut)
def get_auth_me(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    role = user.get("role")
    if role == "student":
        student = db.query(models.Student).filter(
            models.Student.id == user.get("student_id")
        ).first()
        if not student:
            student = db.query(models.Student).filter(
                or_(
                    models.Student.college_email == user.get("sub"),
                    models.Student.personal_email == user.get("sub"),
                )
            ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return schemas.AuthMeOut(
            role="student",
            email=student.college_email,
            student_id=student.id,
            profile=_student_to_out(student).model_dump(),
        )
    if role == "company":
        import company_models as cm
        company = db.query(cm.Company).filter(cm.Company.id == user.get("company_id")).first()
        if not company:
            company = db.query(cm.Company).filter(cm.Company.email == user.get("sub")).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return schemas.AuthMeOut(
            role="company",
            email=company.email,
            company_id=company.id,
            profile={"id": company.id, "name": company.name, "email": company.email, "status": company.status.value},
        )
    if role == "admin":
        return schemas.AuthMeOut(role="admin", email=user.get("sub") or ADMIN_EMAIL)
    raise HTTPException(status_code=401, detail="Invalid session")


@router.post("/refresh", response_model=schemas.TokenOut)
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotate refresh token and issue a new access token."""
    refresh_token = request.cookies.get(COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    record = verify_refresh_token(refresh_token, db)
    role = record.user_type.value if hasattr(record.user_type, "value") else record.user_type

    access_payload = {"role": role}
    student_id = None
    company_id = None
    email = None

    if role == "student":
        student = db.query(models.Student).filter(models.Student.id == record.user_id).first()
        if (
            not student
            or student.status == models.StudentStatus.blocked
            or not student.is_fully_verified
            or student.status != models.StudentStatus.active
        ):
            raise HTTPException(status_code=401, detail="Student session invalid")
        access_payload["sub"] = student.college_email
        access_payload["student_id"] = student.id
        student_id = student.id
        email = student.college_email
    elif role == "company":
        import company_models as cm
        company = db.query(cm.Company).filter(cm.Company.id == record.user_id).first()
        if (
            not company
            or not company.is_email_verified
            or company.status != cm.CompanyStatus.approved
        ):
            raise HTTPException(status_code=401, detail="Company session invalid")
        access_payload["sub"] = company.email
        access_payload["company_id"] = company.id
        company_id = company.id
        email = company.email
    elif role == "admin":
        access_payload["sub"] = ADMIN_EMAIL
        email = ADMIN_EMAIL
    else:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = rotate_refresh_token(
        response,
        db,
        record,
        role=role,
        user_id=record.user_id,
        access_payload=access_payload,
    )

    log_audit(
        db,
        actor_type=role,
        actor_id=record.user_id if role != "admin" else None,
        actor_email=email,
        action="token_refreshed",
    )

    return schemas.TokenOut(
        access_token=access_token,
        student_id=student_id,
        company_id=company_id if role == "company" else None,
        role=role,
        email=email,
    )


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Revoke refresh token and clear session cookie."""
    refresh_token = request.cookies.get(COOKIE_NAME)
    actor_email = None
    actor_type = None
    actor_id = None
    if refresh_token:
        try:
            record = verify_refresh_token(refresh_token, db)
            actor_type = record.user_type.value if hasattr(record.user_type, "value") else record.user_type
            actor_id = record.user_id
            revoke_refresh_token(record, db)
        except HTTPException:
            pass
    clear_refresh_cookie(response)
    if actor_type:
        log_audit(
            db,
            actor_type=actor_type,
            actor_id=actor_id,
            actor_email=actor_email,
            action="logout",
        )
    return {"message": "Logged out successfully"}


@router.post("/admin-login", response_model=schemas.TokenOut)
def admin_login(
    request: Request,
    data: schemas.SendOTPRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Admin login with email + password."""
    _rate_limit_auth(request, f"admin-login:{data.email}", max_requests=10, window=900)
    if data.email != ADMIN_EMAIL or data.name != ADMIN_PASSWORD:
        log_audit(
            db,
            actor_type="admin",
            actor_email=data.email,
            action="login_failed",
        )
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    access_token = issue_auth_tokens(
        response,
        db,
        role="admin",
        user_id=0,
        access_payload={"sub": data.email, "role": "admin"},
    )

    log_audit(db, actor_type="admin", actor_email=data.email, action="login")
    return schemas.TokenOut(access_token=access_token, role="admin", email=data.email)
