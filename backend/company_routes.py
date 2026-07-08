"""
company_routes.py - All API routes for Company Portal
Mounted on /company prefix in main.py
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from passlib.context import CryptContext
from datetime import datetime
import os, shutil

from database import get_db
from auth import (
    create_token,
    get_current_user,
    get_current_student,
    issue_auth_tokens,
    verify_password,
)
from auth_utils import (
    check_account_lockout,
    cleanup_expired_pending_company,
    normalize_email,
    record_failed_login,
    reset_login_attempts,
    send_verification_otp,
    verification_deadline,
)
from config import PENDING_VERIFICATION_EXPIRE_HOURS
from rate_limit import check_rate_limit
import company_models as cm
import company_schemas as cs
from company_email import send_company_status_email, send_company_approval_email
from audit_utils import log_audit
from notification_service import notify_student, notify_company

router = APIRouter(prefix="/company", tags=["Company"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_company(request: Request, key: str, max_requests: int = 10, window: int = 300):
    allowed, msg = check_rate_limit(f"{key}:{_client_ip(request)}", max_requests, window)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_approved_company(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency: ensure caller is an approved company."""
    if user.get("role") != "company":
        raise HTTPException(status_code=403, detail="Company access only")
    company = db.query(cm.Company).filter(cm.Company.email == user["sub"]).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if company.status != cm.CompanyStatus.approved:
        raise HTTPException(status_code=403, detail="Company not approved yet")
    return company


# ─── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=cs.CompanyRegisterOut, tags=["Company Auth"])
def register_company(data: cs.CompanyRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new company. Email verification required before login."""
    email = normalize_email(str(data.email))
    _rate_limit_company(request, f"company-register:{email}", max_requests=5, window=3600)

    existing = db.query(cm.Company).filter(cm.Company.email == email).first()
    existing = cleanup_expired_pending_company(db, existing)
    if existing:
        if existing.is_email_verified:
            raise HTTPException(status_code=409, detail="Email already registered. Please log in.")
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Registration already in progress. Complete email verification to activate your account.",
                "code": "VERIFICATION_PENDING",
                "company_id": existing.id,
            },
        )

    expires_at = verification_deadline()
    company = cm.Company(
        name=data.name,
        email=email,
        password_hash=pwd_ctx.hash(data.password),
        website=data.website,
        industry=data.industry,
        description=data.description,
        logo=data.logo or "🏢",
        location=data.location,
        hr_name=getattr(data, "hr_name", "") or "",
        hr_contact=getattr(data, "hr_contact", "") or "",
        company_size=getattr(data, "company_size", "") or "",
        is_email_verified=False,
        status=cm.CompanyStatus.pending,
        verification_expires_at=expires_at,
    )
    db.add(company)
    import auth_models as am
    try:
        send_verification_otp(db, company.email, am.UserType.company, company.name)
        db.commit()
        db.refresh(company)
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
            status_code=500,
            detail="Registration failed: Verification email could not be sent. Please try again later."
        )

    log_audit(
        db,
        actor_type="company",
        actor_id=company.id,
        actor_email=company.email,
        action="registered",
    )

    return cs.CompanyRegisterOut(
        message=(
            f"Registration successful. Verify your company email within "
            f"{PENDING_VERIFICATION_EXPIRE_HOURS} hours. Admin approval is required before you can post jobs."
        ),
        company_id=company.id,
        email=company.email,
        verification_expires_at=expires_at,
    )


@router.post("/login", response_model=cs.CompanyTokenOut, tags=["Company Auth"])
def login_company(data: cs.CompanyLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    """Company login. Requires verified email and admin approval."""
    email = normalize_email(str(data.email))
    _rate_limit_company(request, f"company-login:{email}", max_requests=15, window=900)

    company = db.query(cm.Company).filter(cm.Company.email == email).first()
    company = cleanup_expired_pending_company(db, company)

    if company:
        check_account_lockout(company.locked_until)

    if not company or not verify_password(data.password, company.password_hash):
        if company:
            record_failed_login(db, company, actor_type="company", email=email)
            log_audit(
                db,
                actor_type="company",
                actor_id=company.id,
                actor_email=email,
                action="login_failed",
            )
        else:
            log_audit(
                db,
                actor_type="company",
                actor_email=email,
                action="login_failed",
                details="unknown_email",
            )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not company.is_email_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Please complete email verification before logging in.",
                "code": "EMAIL_NOT_VERIFIED",
                "company_id": company.id,
            },
        )
    if company.status == cm.CompanyStatus.pending:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. You will be notified once approved.",
        )
    if company.status == cm.CompanyStatus.rejected:
        raise HTTPException(status_code=403, detail="Your company registration was rejected. Contact support.")
    if company.status == cm.CompanyStatus.suspended:
        raise HTTPException(status_code=403, detail="Your company account has been suspended. Contact support.")
    if company.status != cm.CompanyStatus.approved:
        raise HTTPException(status_code=403, detail=f"Account {company.status.value}")

    reset_login_attempts(db, company)

    access_token = issue_auth_tokens(
        response,
        db,
        role="company",
        user_id=company.id,
        access_payload={
            "sub": company.email,
            "role": "company",
            "company_id": company.id,
        },
    )

    log_audit(
        db,
        actor_type="company",
        actor_id=company.id,
        actor_email=company.email,
        action="login",
    )

    return cs.CompanyTokenOut(access_token=access_token, company_id=company.id)


# ─── Company Profile ──────────────────────────────────────────────────────────

@router.get("/profile", response_model=cs.CompanyOut, tags=["Company"])
def get_profile(company=Depends(get_approved_company)):
    return company


@router.put("/profile", response_model=cs.CompanyOut, tags=["Company"])
def update_profile(
    data    : cs.CompanyUpdate,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    for field, value in data.dict(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return company


# ─── Company Dashboard Stats ──────────────────────────────────────────────────

@router.get("/dashboard", tags=["Company"])
def company_dashboard(company=Depends(get_approved_company), db: Session = Depends(get_db)):
    """Stats for company dashboard."""
    jobs         = db.query(cm.CompanyJob).filter(cm.CompanyJob.company_id == company.id).all()
    total_jobs   = len(jobs)
    active_jobs  = sum(1 for j in jobs if j.status == cm.JobStatus.active)
    closed_jobs  = sum(1 for j in jobs if j.status == cm.JobStatus.closed)
    job_ids      = [j.id for j in jobs]
    total_apps   = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id.in_(job_ids)
    ).count() if job_ids else 0

    return {
        "total_jobs"        : total_jobs,
        "active_jobs"       : active_jobs,
        "closed_jobs"       : closed_jobs,
        "total_applications": total_apps,
    }


# ─── Jobs ─────────────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=List[cs.JobOut], tags=["Company Jobs"])
def get_my_jobs(company=Depends(get_approved_company), db: Session = Depends(get_db)):
    return db.query(cm.CompanyJob).filter(
        cm.CompanyJob.company_id == company.id
    ).order_by(cm.CompanyJob.created_at.desc()).all()


@router.post("/jobs", response_model=cs.JobOut, tags=["Company Jobs"])
def create_job(
    data    : cs.JobCreate,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    job = cm.CompanyJob(company_id=company.id, **data.dict())
    db.add(job)
    db.commit()
    db.refresh(job)

    log_audit(
        db,
        actor_type="company",
        actor_id=company.id,
        actor_email=company.email,
        action="job_posted",
        resource_type="company_job",
        resource_id=job.id,
        details=job.title,
    )

    return job


@router.get("/jobs/{job_id}", response_model=cs.JobOut, tags=["Company Jobs"])
def get_job(job_id: int, company=Depends(get_approved_company), db: Session = Depends(get_db)):
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/jobs/{job_id}", response_model=cs.JobOut, tags=["Company Jobs"])
def update_job(
    job_id  : int,
    data    : cs.JobUpdate,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}", tags=["Company Jobs"])
def delete_job(job_id: int, company=Depends(get_approved_company), db: Session = Depends(get_db)):
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@router.patch("/jobs/{job_id}/toggle", response_model=cs.JobOut, tags=["Company Jobs"])
def toggle_job_status(
    job_id  : int,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    """Toggle job between active and closed."""
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = cm.JobStatus.closed if job.status == cm.JobStatus.active else cm.JobStatus.active
    db.commit()
    db.refresh(job)
    return job


# ─── Applicants ───────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/applicants", response_model=List[cs.CompanyApplicationOut], tags=["Company Applicants"])
def get_applicants(
    job_id  : int,
    status  : Optional[str] = Query(None),
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    """Get all applicants for a job. Optionally filter by status."""
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    query = db.query(cm.CompanyApplication).filter(cm.CompanyApplication.job_id == job_id)
    if status:
        query = query.filter(cm.CompanyApplication.status == status)
    return query.all()


@router.put("/applicants/{app_id}/status", response_model=cs.CompanyApplicationOut, tags=["Company Applicants"])
def update_applicant_status(
    app_id  : int,
    data    : cs.AppStatusUpdate,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    """Update applicant status and send email notification."""
    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.id == app_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify job belongs to this company
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == application.job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not your applicant")

    old_status        = application.status
    application.status = data.status
    db.commit()
    db.refresh(application)

    # Send email if status changed
    if old_status != data.status:
        try:
            send_company_status_email(
                to_email     = application.student.college_email,
                student_name = application.student.full_name,
                job_title    = job.title,
                company_name = company.name,
                status       = data.status.value
            )
        except Exception as e:
            print(f"[Email] {e}")

        log_audit(
            db,
            actor_type="company",
            actor_id=company.id,
            actor_email=company.email,
            action="application_status_changed",
            resource_type="company_application",
            resource_id=application.id,
            details=f"{old_status.value} -> {data.status.value}",
        )

        notify_student(
            db, application.student_id,
            f"Application Update: {data.status.value}",
            f"Your application for {job.title} at {company.name} is now {data.status.value}.",
        )

    return application


@router.get("/applicants/{app_id}/resume", tags=["Company Applicants"])
def download_resume(
    app_id  : int,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    """Download the resume file for an applicant."""
    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.id == app_id
    ).first()
    if not application or not application.resume_path:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == application.job_id,
        cm.CompanyJob.company_id == company.id
    ).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not your applicant")

    if not os.path.isfile(application.resume_path):
        raise HTTPException(status_code=404, detail="Resume file missing on server")

    filename = os.path.basename(application.resume_path)
    return FileResponse(
        application.resume_path,
        media_type="application/pdf",
        filename=filename,
    )


def _job_deadline_passed(job: cm.CompanyJob) -> bool:
    if not job.deadline:
        return False
    try:
        return datetime.strptime(job.deadline, "%Y-%m-%d").date() < datetime.utcnow().date()
    except ValueError:
        return False


# ─── Student: Apply to Company Job ────────────────────────────────────────────

@router.post("/jobs/{job_id}/apply", response_model=cs.CompanyApplicationOut, tags=["Student"])
def apply_to_company_job(
    job_id     : int,
    cover_note : Optional[str] = "",
    db         : Session = Depends(get_db),
    student    = Depends(get_current_student),
):
    """Authenticated student applies to a company job."""
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.status == cm.JobStatus.active
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")
    if _job_deadline_passed(job):
        raise HTTPException(status_code=400, detail="Application deadline has passed")

    existing = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id == job_id,
        cm.CompanyApplication.student_id == student.id,
        cm.CompanyApplication.status != cm.CompanyApplicationStatus.withdrawn,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    app = cm.CompanyApplication(
        job_id     = job_id,
        student_id = student.id,
        cover_note = cover_note,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="application_submitted",
        resource_type="company_job",
        resource_id=job_id,
        details=job.title,
    )

    notify_student(
        db, student.id,
        "Application Submitted",
        f"Your application for {job.title} at {job.company.name if job.company else 'Company'} has been submitted.",
    )
    notify_company(
        db, job.company_id,
        "New Application",
        f"{student.full_name} applied for {job.title}.",
    )

    return app


@router.delete("/applications/{app_id}", tags=["Student"])
def withdraw_company_application(
    app_id: int,
    db: Session = Depends(get_db),
    student=Depends(get_current_student),
):
    """Withdraw a company job application before the deadline."""
    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.id == app_id,
        cm.CompanyApplication.student_id == student.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != cm.CompanyApplicationStatus.applied:
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn")

    job = db.query(cm.CompanyJob).filter(cm.CompanyJob.id == application.job_id).first()
    if job and _job_deadline_passed(job):
        raise HTTPException(status_code=400, detail="Cannot withdraw after deadline")

    application.status = cm.CompanyApplicationStatus.withdrawn
    db.commit()

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="application_withdrawn",
        resource_type="company_job",
        resource_id=application.job_id,
    )
    return {"message": "Application withdrawn successfully"}


@router.post("/jobs/{job_id}/upload-resume", tags=["Student"])
def upload_resume(
    job_id     : int,
    file       : UploadFile = File(...),
    db         : Session = Depends(get_db),
    student    = Depends(get_current_student),
):
    """Upload resume when applying. Saves to uploads/resumes/."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes allowed")

    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id == job_id,
        cm.CompanyApplication.student_id == student.id,
        cm.CompanyApplication.status != cm.CompanyApplicationStatus.withdrawn,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Apply to the job before uploading a resume")

    safe_filename = f"student_{student.id}_job_{job_id}.pdf"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    application.resume_path = file_path
    db.commit()

    return {"message": "Resume uploaded", "path": file_path}
