"""
admin_routes.py - Admin super dashboard routes
Mounted on /admin prefix in main.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import require_admin
import company_models as cm
import company_schemas as cs
import models
import auth_models as am
from company_email import send_company_approval_email

router = APIRouter(prefix="/admin", tags=["Admin"])


def _student_to_admin_dict(student: models.Student) -> dict:
    return {
        "id": student.id,
        "full_name": student.full_name,
        "username": student.username,
        "personal_email": student.personal_email,
        "college_email": student.college_email,
        "college_name": student.college_name,
        "branch": student.branch or "",
        "year": student.year or "",
        "semester": student.semester or "",
        "graduation_year": student.graduation_year or "",
        "roll_number": student.roll_number or "",
        "skills": student.skills or "",
        "linkedin_url": student.linkedin_url or "",
        "github_url": student.github_url or "",
        "portfolio_url": student.portfolio_url or "",
        "resume_path": student.resume_path or "",
        "profile_picture": student.profile_picture or "",
        "tnp_head_name": student.tnp_head_name,
        "tnp_head_phone": student.tnp_head_phone,
        "is_email_verified": student.is_email_verified,
        "is_college_email_verified": student.is_college_email_verified,
        "is_active": student.is_active,
        "status": student.status.value,
        "created_at": student.created_at,
    }


# ─── Platform Stats ───────────────────────────────────────────────────────────

@router.get("/stats", response_model=cs.AdminStatsOut, tags=["Admin"])
def admin_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    return cs.AdminStatsOut(
        total_students     = db.query(models.Student).count(),
        total_companies    = db.query(cm.Company).count(),
        total_jobs         = db.query(cm.CompanyJob).count(),
        total_applications = db.query(cm.CompanyApplication).count(),
        active_companies   = db.query(cm.Company).filter(
            cm.Company.status == cm.CompanyStatus.approved
        ).count(),
        pending_approvals  = db.query(cm.Company).filter(
            cm.Company.status == cm.CompanyStatus.pending
        ).count(),
    )


# ─── Company Management ───────────────────────────────────────────────────────

@router.get("/companies", response_model=List[cs.CompanyOut], tags=["Admin"])
def list_companies(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(cm.Company).order_by(cm.Company.created_at.desc()).all()


@router.get("/companies/{company_id}", response_model=cs.CompanyOut, tags=["Admin"])
def get_company(company_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    company = db.query(cm.Company).filter(cm.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/companies/{company_id}/status", response_model=cs.CompanyOut, tags=["Admin"])
def update_company_status(
    company_id  : int,
    data        : cs.CompanyStatusUpdate,
    db          : Session = Depends(get_db),
    _           = Depends(require_admin)
):
    """Approve, reject, suspend, or activate a company."""
    company = db.query(cm.Company).filter(cm.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    old_status     = company.status
    company.status = data.status
    db.commit()
    db.refresh(company)

    # Send approval/rejection email
    if old_status == cm.CompanyStatus.pending:
        if data.status == cm.CompanyStatus.approved:
            try:
                send_company_approval_email(company.email, company.name, approved=True)
            except Exception as e:
                print(f"[Email] {e}")
        elif data.status == cm.CompanyStatus.rejected:
            try:
                send_company_approval_email(company.email, company.name, approved=False)
            except Exception as e:
                print(f"[Email] {e}")

    return company


@router.delete("/companies/{company_id}", tags=["Admin"])
def delete_company(company_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    company = db.query(cm.Company).filter(cm.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}


# ─── Job Management ───────────────────────────────────────────────────────────

@router.get("/jobs", response_model=List[cs.JobOut], tags=["Admin"])
def list_all_jobs(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(cm.CompanyJob).order_by(cm.CompanyJob.created_at.desc()).all()


@router.delete("/jobs/{job_id}", tags=["Admin"])
def admin_delete_job(job_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    job = db.query(cm.CompanyJob).filter(cm.CompanyJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


# ─── Application Management ───────────────────────────────────────────────────

@router.get("/applications", tags=["Admin"])
def list_all_company_applications(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(cm.CompanyApplication).order_by(
        cm.CompanyApplication.applied_at.desc()
    ).all()


# ─── Student Management ───────────────────────────────────────────────────────

@router.get("/students", tags=["Admin"])
def list_students(db: Session = Depends(get_db), _=Depends(require_admin)):
    students = db.query(models.Student).order_by(models.Student.created_at.desc()).all()
    return [_student_to_admin_dict(s) for s in students]


@router.put("/students/{student_id}/status", tags=["Admin"])
def update_student_status(
    student_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if status not in ("active", "blocked", "pending"):
        raise HTTPException(status_code=422, detail="Invalid status")
    student.status = models.StudentStatus(status)
    if status == "blocked":
        student.is_active = False
    elif status == "active":
        student.is_active = True
    db.commit()
    return {"message": f"Student status updated to {status}"}


# ─── Audit Logs ───────────────────────────────────────────────────────────────

@router.get("/audit-logs", tags=["Admin"])
def get_audit_logs(db: Session = Depends(get_db), _=Depends(require_admin)):
    logs = db.query(am.AuditLog).order_by(am.AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "actor_type": l.actor_type,
            "actor_email": l.actor_email,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details,
            "created_at": l.created_at,
        }
        for l in logs
    ]