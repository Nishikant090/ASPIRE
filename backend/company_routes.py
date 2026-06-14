"""
company_routes.py - All API routes for Company Portal
Mounted on /company prefix in main.py
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from passlib.context import CryptContext
import os, shutil

from database import get_db
from auth import create_token, get_current_user
import company_models as cm
import company_schemas as cs
from company_email import send_company_status_email, send_company_approval_email

router = APIRouter(prefix="/company", tags=["Company"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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

@router.post("/register", response_model=cs.CompanyOut, tags=["Company Auth"])
def register_company(data: cs.CompanyRegister, db: Session = Depends(get_db)):
    """Register a new company. Status starts as 'pending' until admin approves."""
    existing = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    company = cm.Company(
        name          = data.name,
        email         = data.email,
        password_hash = pwd_ctx.hash(data.password),
        website       = data.website,
        industry      = data.industry,
        description   = data.description,
        logo          = data.logo or "🏢",
        location      = data.location,
        status        = cm.CompanyStatus.pending
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.post("/login", response_model=cs.CompanyTokenOut, tags=["Company Auth"])
def login_company(data: cs.CompanyLogin, db: Session = Depends(get_db)):
    """Company login. Only approved companies can log in."""
    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if not company or not pwd_ctx.verify(data.password, company.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if company.status == cm.CompanyStatus.pending:
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    if company.status in [cm.CompanyStatus.rejected, cm.CompanyStatus.suspended]:
        raise HTTPException(status_code=403, detail=f"Account {company.status.value}")
    token = create_token({"sub": company.email, "role": "company", "company_id": company.id})
    return cs.CompanyTokenOut(access_token=token, company_id=company.id)


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
                to_email     = application.student.email,
                student_name = application.student.name,
                job_title    = job.title,
                company_name = company.name,
                status       = data.status.value
            )
        except Exception as e:
            print(f"[Email] {e}")

    return application


@router.get("/applicants/{app_id}/resume", tags=["Company Applicants"])
def download_resume(
    app_id  : int,
    company = Depends(get_approved_company),
    db      : Session = Depends(get_db)
):
    """Get the resume file path for an applicant."""
    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.id == app_id
    ).first()
    if not application or not application.resume_path:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"resume_path": application.resume_path}


# ─── Student: Apply to Company Job ────────────────────────────────────────────

@router.post("/jobs/{job_id}/apply", response_model=cs.CompanyApplicationOut, tags=["Student"])
def apply_to_company_job(
    job_id     : int,
    student_id : int,
    cover_note : Optional[str] = "",
    db         : Session = Depends(get_db)
):
    """Student applies to a company job."""
    from models import Student
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.status == cm.JobStatus.active
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    existing = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id == job_id,
        cm.CompanyApplication.student_id == student_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    app = cm.CompanyApplication(
        job_id     = job_id,
        student_id = student_id,
        cover_note = cover_note
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.post("/jobs/{job_id}/upload-resume", tags=["Student"])
def upload_resume(
    job_id     : int,
    student_id : int,
    file       : UploadFile = File(...),
    db         : Session = Depends(get_db)
):
    """Upload resume when applying. Saves to uploads/resumes/."""
    # Only allow PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes allowed")

    filename  = f"student_{student_id}_job_{job_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update application with resume path
    application = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id == job_id,
        cm.CompanyApplication.student_id == student_id
    ).first()
    if application:
        application.resume_path = file_path
        db.commit()

    return {"message": "Resume uploaded", "path": file_path}