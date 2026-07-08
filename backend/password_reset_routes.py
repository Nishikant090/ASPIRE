"""
password_reset_routes.py - Forgot/Reset password API routes
Handles both Student and Company flows with secure OTP validation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from database import get_db
from auth import require_admin, revoke_all_user_sessions
import models
import company_models as cm
import password_reset_models as prm
from password_reset_utils import (
    generate_otp, create_reset_token, get_valid_token,
    validate_password, check_rate_limit, record_rate_limit,
    log_action,
)
from password_reset_email import send_password_reset_email, send_password_changed_email

router = APIRouter(prefix="/auth", tags=["Password Reset"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email        : str
    otp          : str
    new_password : str


class ValidateOTPRequest(BaseModel):
    email: str
    otp  : str


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── Student Forgot Password ──────────────────────────────────────────────────

@router.post("/student/forgot-password")
def student_forgot_password(
    data    : ForgotPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    allowed, msg = check_rate_limit(data.email, ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    student = db.query(models.Student).filter(
        models.Student.college_email == data.email
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Account not found")

    record_rate_limit(data.email, ip)
    log_action(data.email, "student", "requested", ip, db)

    otp = generate_otp()
    create_reset_token(student.college_email, "student", otp, db)
    try:
        send_password_reset_email(student.college_email, otp, "student")
    except Exception as e:
        print(f"[Email] Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP. Try again later.")

    return {"message": "OTP sent to your registered college email."}


@router.post("/student/validate-otp")
def student_validate_otp(data: ValidateOTPRequest, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(
        models.Student.college_email == data.email
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Account not found")

    token = get_valid_token(student.college_email, "student", data.otp, db)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "OTP is valid"}


@router.post("/student/reset-password")
def student_reset_password(
    data    : ResetPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    is_valid, error_msg = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    student = db.query(models.Student).filter(
        models.Student.college_email == data.email
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Account not found")

    token = get_valid_token(student.college_email, "student", data.otp, db)
    if not token:
        log_action(data.email, "student", "failed", ip, db, "Invalid or expired OTP")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    student.password_hash = pwd_ctx.hash(data.new_password)
    token.used = True
    db.commit()
    revoke_all_user_sessions("student", student.id, db)

    log_action(data.email, "student", "password_changed", ip, db)

    try:
        send_password_changed_email(student.college_email, "student")
    except Exception as e:
        print(f"[Email] {e}")

    return {"message": "Password reset successfully. Please log in with your new password."}


# ─── Company Forgot Password ──────────────────────────────────────────────────

@router.post("/company/forgot-password")
def company_forgot_password(
    data    : ForgotPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    allowed, msg = check_rate_limit(data.email, ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if not company:
        raise HTTPException(status_code=404, detail="Account not found")

    record_rate_limit(data.email, ip)
    log_action(data.email, "company", "requested", ip, db)

    otp = generate_otp()
    create_reset_token(company.email, "company", otp, db)
    try:
        send_password_reset_email(company.email, otp, "company")
    except Exception as e:
        print(f"[Email] Failed to send reset email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP. Try again later.")

    return {"message": "OTP sent to your registered email."}


@router.post("/company/validate-otp")
def company_validate_otp(data: ValidateOTPRequest, db: Session = Depends(get_db)):
    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if not company:
        raise HTTPException(status_code=404, detail="Account not found")

    token = get_valid_token(company.email, "company", data.otp, db)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "OTP is valid"}


@router.post("/company/reset-password")
def company_reset_password(
    data    : ResetPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    is_valid, error_msg = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if not company:
        raise HTTPException(status_code=404, detail="Account not found")

    token = get_valid_token(company.email, "company", data.otp, db)
    if not token:
        log_action(data.email, "company", "failed", ip, db, "Invalid or expired OTP")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    company.password_hash = pwd_ctx.hash(data.new_password)
    token.used = True
    db.commit()
    revoke_all_user_sessions("company", company.id, db)

    log_action(data.email, "company", "password_changed", ip, db)

    try:
        send_password_changed_email(company.email, "company")
    except Exception as e:
        print(f"[Email] {e}")

    return {"message": "Password reset successfully. Please log in with your new password."}


@router.get("/admin/reset-logs", tags=["Admin"])
def get_reset_logs(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    logs = db.query(prm.PasswordResetLog).order_by(
        prm.PasswordResetLog.created_at.desc()
    ).limit(200).all()
    return [
        {
            "id"         : l.id,
            "email"      : l.email,
            "user_type"  : l.user_type,
            "action"     : l.action,
            "ip_address" : l.ip_address,
            "details"    : l.details,
            "created_at" : l.created_at,
        }
        for l in logs
    ]
