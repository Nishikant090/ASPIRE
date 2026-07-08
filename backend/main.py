"""
main.py - FastAPI application entry point
All routes for opportunities, students, applications, and admin
"""

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from email_service import (
    send_application_received_email,
    send_status_update_email
)
from auth import (
    require_admin,
    get_current_student,
    get_current_user,
    get_optional_user,
    get_student_id_from_user,
    hash_password,
)
from config import FRONTEND_URL
from audit_utils import log_audit

from company_models import Base as CompanyBase
import company_models
from company_routes import router as company_router
from admin_routes import router as admin_router
from password_reset_routes import router as password_reset_router
from auth_routes import router as auth_router
import password_reset_models

import models
import schemas
from database import engine, get_db
import company_schemas
import auth_models
from notification_routes import router as notification_router
from job_utils import get_unified_jobs, normalize_opportunity, normalize_company_job
from notification_service import notify_student, notify_company


def ensure_sqlite_compat_schema():
    """Add columns introduced after the first local SQLite schema was created."""
    if engine.dialect.name != "sqlite":
        return

    student_columns = {
        "full_name": "VARCHAR(200)",
        "username": "VARCHAR(100)",
        "personal_email": "VARCHAR(200)",
        "college_email": "VARCHAR(200)",
        "college_name": "VARCHAR(200)",
        "semester": "VARCHAR(50)",
        "graduation_year": "VARCHAR(20)",
        "roll_number": "VARCHAR(100)",
        "linkedin_url": "VARCHAR(500)",
        "github_url": "VARCHAR(500)",
        "portfolio_url": "VARCHAR(500)",
        "resume_path": "VARCHAR(500)",
        "profile_picture": "VARCHAR(500)",
        "tnp_head_name": "VARCHAR(200) DEFAULT ''",
        "tnp_head_phone": "VARCHAR(50) DEFAULT ''",
        "is_email_verified": "BOOLEAN DEFAULT 0 NOT NULL",
        "is_college_email_verified": "BOOLEAN DEFAULT 0 NOT NULL",
        "is_active": "BOOLEAN DEFAULT 1 NOT NULL",
        "status": "VARCHAR(20) DEFAULT 'pending' NOT NULL",
        "verification_expires_at": "DATETIME",
        "failed_login_attempts": "INTEGER DEFAULT 0 NOT NULL",
        "locked_until": "DATETIME",
    }
    company_columns = {
        "hr_name": "VARCHAR(200) DEFAULT '' NOT NULL",
        "hr_contact": "VARCHAR(50) DEFAULT '' NOT NULL",
        "company_size": "VARCHAR(50)",
        "is_email_verified": "BOOLEAN DEFAULT 0 NOT NULL",
        "verification_expires_at": "DATETIME",
        "failed_login_attempts": "INTEGER DEFAULT 0 NOT NULL",
        "locked_until": "DATETIME",
    }

    with engine.begin() as conn:
        tables = {row[0] for row in conn.exec_driver_sql("SELECT name FROM sqlite_master WHERE type='table'")}
        if "students" in tables:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(students)")}
            for column, definition in student_columns.items():
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE students ADD COLUMN {column} {definition}")
            conn.exec_driver_sql("UPDATE students SET full_name = COALESCE(full_name, name, '')")
            conn.exec_driver_sql("UPDATE students SET personal_email = COALESCE(personal_email, email, '')")
            conn.exec_driver_sql("UPDATE students SET college_email = COALESCE(college_email, email, '')")
            conn.exec_driver_sql("UPDATE students SET college_name = COALESCE(college_name, college, '')")
            conn.exec_driver_sql("UPDATE students SET is_email_verified = COALESCE(is_email_verified, is_verified, 0)")
            conn.exec_driver_sql("UPDATE students SET is_college_email_verified = COALESCE(is_college_email_verified, is_email_verified, 0)")
            conn.exec_driver_sql("UPDATE students SET status = COALESCE(status, 'active')")
            conn.exec_driver_sql("UPDATE students SET branch = COALESCE(branch, '')")
            conn.exec_driver_sql("UPDATE students SET year = COALESCE(year, graduation_year, '')")

        if "companies" in tables:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(companies)")}
            for column, definition in company_columns.items():
                if column not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE companies ADD COLUMN {column} {definition}")

        if "password_reset_tokens" in tables:
            existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(password_reset_tokens)")}
            if "attempts" not in existing:
                conn.exec_driver_sql("ALTER TABLE password_reset_tokens ADD COLUMN attempts INTEGER DEFAULT 0")

def cleanup_all_expired_pending_accounts():
    """Remove unverified registrations that exceeded the verification window."""
    from database import SessionLocal
    from auth_utils import cleanup_expired_pending_student, cleanup_expired_pending_company

    db = SessionLocal()
    try:
        pending_students = db.query(models.Student).filter(
            models.Student.is_college_email_verified == False
        ).all()
        for student in pending_students:
            cleanup_expired_pending_student(db, student)

        pending_companies = db.query(company_models.Company).filter(
            company_models.Company.is_email_verified == False
        ).all()
        for company in pending_companies:
            cleanup_expired_pending_company(db, company)
    finally:
        db.close()


# Create all tables in the database
ensure_sqlite_compat_schema()
models.Base.metadata.create_all(bind=engine)
company_models.Base.metadata.create_all(bind=engine)
password_reset_models.Base.metadata.create_all(bind=engine)
auth_models.Base.metadata.create_all(bind=engine)
cleanup_all_expired_pending_accounts()

# Initialize FastAPI app
app = FastAPI(
    title="Aspire API",
    description="Backend API for Aspire Job & Internship Platform",
    version="1.0.0"
)

# Allow requests from React frontend (credentials required for refresh cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)


@app.middleware("http")
async def verify_origin_for_auth(request: Request, call_next):
    """CSRF mitigation for cookie-based auth endpoints."""
    if request.method in ("POST", "PUT", "DELETE") and request.url.path.startswith("/auth/"):
        origin = request.headers.get("origin")
        allowed = {FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"}
        if origin and origin not in allowed:
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=403, content={"detail": "Invalid origin"})
    return await call_next(request)


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=schemas.StatsOut, tags=["General"])
def get_stats(db: Session = Depends(get_db)):
    """Return platform-wide statistics for the home page."""
    import company_models as cm

    opp_jobs = db.query(models.Opportunity).filter(
        models.Opportunity.type == models.OpportunityType.job
    ).count()
    company_jobs = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.status == cm.JobStatus.active,
        cm.CompanyJob.employment_type != cm.EmploymentType.internship,
    ).count()

    opp_internships = db.query(models.Opportunity).filter(
        models.Opportunity.type == models.OpportunityType.internship
    ).count()
    company_internships = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.status == cm.JobStatus.active,
        cm.CompanyJob.employment_type == cm.EmploymentType.internship,
    ).count()

    registered_companies = db.query(cm.Company).filter(
        cm.Company.status == cm.CompanyStatus.approved
    ).count()
    opp_companies = db.query(models.Opportunity.company).distinct().count()
    total_companies = registered_companies + opp_companies

    opp_apps = db.query(models.Application).count()
    company_apps = db.query(cm.CompanyApplication).count()

    return schemas.StatsOut(
        total_jobs=opp_jobs + company_jobs,
        total_internships=opp_internships + company_internships,
        total_companies=total_companies,
        total_applications=opp_apps + company_apps,
    )


# ─── Unified Jobs (single source of truth) ────────────────────────────────────

@app.get("/jobs", response_model=List[schemas.UnifiedJobOut], tags=["Jobs"])
def list_unified_jobs(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Merged job feed from admin opportunities and company-posted jobs."""
    return get_unified_jobs(db, search=search, type_filter=type, company=company)


@app.get("/jobs/featured", response_model=List[schemas.UnifiedJobOut], tags=["Jobs"])
def featured_jobs(db: Session = Depends(get_db)):
    """Latest jobs for home page and recommendations."""
    return get_unified_jobs(db, limit=12)


@app.get("/jobs/recommended", response_model=List[schemas.UnifiedJobOut], tags=["Jobs"])
def recommended_jobs(
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student),
):
    """Jobs recommended based on student skills."""
    all_jobs = get_unified_jobs(db, limit=50)
    if not student.skills:
        return all_jobs[:6]

    student_skills = {s.strip().lower() for s in student.skills.split(",") if s.strip()}
    scored = []
    for job in all_jobs:
        job_skills = {s.strip().lower() for s in job.get("skills", "").split(",") if s.strip()}
        overlap = len(student_skills & job_skills)
        scored.append((overlap, job))
    scored.sort(key=lambda x: (-x[0], x[1].get("created_at") or ""), reverse=True)
    return [j for _, j in scored[:6]] or all_jobs[:6]


# ─── Opportunities ────────────────────────────────────────────────────────────

@app.get("/opportunities", response_model=List[schemas.OpportunityOut], tags=["Opportunities"])
def list_opportunities(
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all opportunities with optional filtering."""
    query = db.query(models.Opportunity)

    if search:
        query = query.filter(models.Opportunity.title.ilike(f"%{search}%"))
    if type and type in ["job", "internship"]:
        query = query.filter(models.Opportunity.type == type)
    if company:
        query = query.filter(models.Opportunity.company.ilike(f"%{company}%"))

    return query.order_by(models.Opportunity.created_at.desc()).all()


@app.get("/opportunities/featured", response_model=List[schemas.OpportunityOut], tags=["Opportunities"])
def featured_opportunities(db: Session = Depends(get_db)):
    """Return 6 most recent opportunities for the home page featured section."""
    return db.query(models.Opportunity).order_by(
        models.Opportunity.created_at.desc()
    ).limit(6).all()


@app.get("/opportunities/{opportunity_id}", response_model=schemas.OpportunityOut, tags=["Opportunities"])
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    """Get a single opportunity by ID."""
    opp = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


@app.get(
    "/opportunities/{opportunity_id}/application-status",
    response_model=schemas.CompanyJobApplicationStatus,
    tags=["Opportunities"],
)
def get_opportunity_application_status(
    opportunity_id: int,
    db: Session = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Check whether the current student has applied to this opportunity."""
    if not user or user.get("role") != "student":
        return schemas.CompanyJobApplicationStatus(applied=False)

    student_id = get_student_id_from_user(user, db)
    app = db.query(models.Application).filter(
        models.Application.opportunity_id == opportunity_id,
        models.Application.student_id == student_id,
        models.Application.status != models.ApplicationStatus.withdrawn,
    ).first()
    if not app:
        return schemas.CompanyJobApplicationStatus(applied=False)
    return schemas.CompanyJobApplicationStatus(
        applied=True,
        application_id=app.id,
        status=app.status.value,
    )


@app.post("/opportunities", response_model=schemas.OpportunityOut, tags=["Admin"])
def create_opportunity(opp: schemas.OpportunityCreate, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """Admin: Create a new job or internship listing."""
    db_opp = models.Opportunity(**opp.dict())
    db.add(db_opp)
    db.commit()
    db.refresh(db_opp)
    return db_opp


@app.put("/opportunities/{opportunity_id}", response_model=schemas.OpportunityOut, tags=["Admin"])
def update_opportunity(
    opportunity_id: int,
    opp_update: schemas.OpportunityUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Admin: Update an existing opportunity."""
    opp = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    update_data = opp_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(opp, field, value)

    db.commit()
    db.refresh(opp)
    return opp


@app.delete("/opportunities/{opportunity_id}", tags=["Admin"])
def delete_opportunity(opportunity_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """Admin: Delete an opportunity listing."""
    opp = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    db.delete(opp)
    db.commit()
    return {"message": "Opportunity deleted successfully"}


# ─── Students ─────────────────────────────────────────────────────────────────

def _serialize_student(student: models.Student) -> schemas.StudentOut:
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


@app.post("/students", response_model=schemas.StudentOut, tags=["Students"])
def create_student_legacy(
    student: schemas.StudentRegisterLegacy,
    db: Session = Depends(get_db)
):
    """Legacy profile update endpoint. Use POST /auth/register for new accounts."""
    full_name = student.full_name or student.name or "Student"
    personal_email = student.personal_email or student.email
    if not personal_email:
        raise HTTPException(status_code=422, detail="Email is required")

    college_name = student.college_name or student.college or ""
    college_email = student.college_email or personal_email

    existing = (
        db.query(models.Student)
        .filter(models.Student.personal_email == personal_email)
        .first()
    )

    if existing:
        existing.full_name = full_name
        existing.college_email = college_email
        existing.college_name = college_name
        if student.branch is not None:
            existing.branch = student.branch
        if student.year:
            existing.year = student.year
        if student.skills is not None:
            existing.skills = student.skills
        if student.tnp_head_name:
            existing.tnp_head_name = student.tnp_head_name
        if student.tnp_head_phone:
            existing.tnp_head_phone = student.tnp_head_phone
        if student.password:
            existing.password_hash = hash_password(student.password)
        db.commit()
        db.refresh(existing)
        return _serialize_student(existing)

    raise HTTPException(
        status_code=400,
        detail="Use POST /auth/register to create a new student account.",
    )


@app.get("/students/me", response_model=schemas.StudentOut, tags=["Students"])
def get_current_student_profile(student: models.Student = Depends(get_current_student)):
    """Get the authenticated student's profile."""
    return _serialize_student(student)


@app.get("/students/{student_id}", response_model=schemas.StudentOut, tags=["Students"])
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get student by ID — restricted to the student themselves or admin."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    role = user.get("role")
    if role == "admin":
        return _serialize_student(student)
    if role == "student" and user.get("student_id") == student_id:
        return _serialize_student(student)
    if role == "student" and user.get("sub") == student.personal_email:
        return _serialize_student(student)
    raise HTTPException(status_code=403, detail="Access denied")


@app.get("/students/email/{email}", response_model=schemas.StudentOut, tags=["Students"])
def get_student_by_email(
    email: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Find student by college email — restricted to the student themselves or admin."""
    student = db.query(models.Student).filter(
        or_(
            models.Student.college_email == email,
            models.Student.personal_email == email,
        )
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    role = user.get("role")
    if role == "admin" or (role == "student" and user.get("sub") == email):
        return _serialize_student(student)
    raise HTTPException(status_code=403, detail="Access denied")



# ─── Applications ─────────────────────────────────────────────────────────────

def _can_withdraw_opportunity(app: models.Application) -> bool:
    return app.status == models.ApplicationStatus.applied


@app.post("/applications", response_model=schemas.ApplicationOut, tags=["Applications"])
def apply_to_opportunity(
    app_data: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student),
):
    """Authenticated student applies to an opportunity."""
    if app_data.student_id != student.id:
        raise HTTPException(status_code=403, detail="Cannot apply on behalf of another student")

    opp = db.query(models.Opportunity).filter(models.Opportunity.id == app_data.opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    existing = db.query(models.Application).filter(
        models.Application.student_id == student.id,
        models.Application.opportunity_id == app_data.opportunity_id,
        models.Application.status != models.ApplicationStatus.withdrawn,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this opportunity")

    new_app = models.Application(
        student_id=student.id,
        opportunity_id=app_data.opportunity_id,
        cover_note=app_data.cover_note,
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="application_submitted",
        resource_type="opportunity",
        resource_id=opp.id,
        details=opp.title,
    )

    notify_student(
        db, student.id,
        "Application Submitted",
        f"Your application for {opp.title} at {opp.company} has been submitted.",
    )

    try:
        send_application_received_email(
            to_email=student.college_email,
            student_name=student.full_name,
            job_title=opp.title,
            company=opp.company,
        )
    except Exception as e:
        print(f"[Email] Failed to send application confirmation: {e}")

    return new_app


@app.get("/applications/me", response_model=List[schemas.ApplicationOut], tags=["Applications"])
def get_my_opportunity_applications(
    student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get all opportunity applications for the authenticated student."""
    return db.query(models.Application).filter(
        models.Application.student_id == student.id,
        models.Application.status != models.ApplicationStatus.withdrawn,
    ).order_by(models.Application.applied_at.desc()).all()


@app.get("/applications/student/{student_id}", response_model=List[schemas.ApplicationOut], tags=["Applications"])
def get_student_applications(
    student_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get applications for a student — restricted to that student or admin."""
    role = user.get("role")
    if role == "admin":
        pass
    elif role == "student" and (
        user.get("student_id") == student_id
        or db.query(models.Student).filter(
            models.Student.id == student_id,
            models.Student.personal_email == user.get("sub"),
        ).first()
    ):
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(models.Application).filter(
        models.Application.student_id == student_id,
        models.Application.status != models.ApplicationStatus.withdrawn,
    ).order_by(models.Application.applied_at.desc()).all()


@app.delete("/applications/{application_id}", tags=["Applications"])
def withdraw_opportunity_application(
    application_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student),
):
    """Withdraw an opportunity application (only while status is Applied)."""
    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.student_id == student.id,
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != models.ApplicationStatus.applied:
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn")

    application.status = models.ApplicationStatus.withdrawn
    db.commit()

    log_audit(
        db,
        actor_type="student",
        actor_id=student.id,
        actor_email=student.college_email,
        action="application_withdrawn",
        resource_type="opportunity",
        resource_id=application.opportunity_id,
    )
    return {"message": "Application withdrawn successfully"}


@app.get("/students/me/applications", response_model=List[schemas.StudentApplicationItem], tags=["Applications"])
def get_all_my_applications(
    student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Unified list of all applications (opportunities + company jobs) for the student."""
    import company_models as cm

    items: List[schemas.StudentApplicationItem] = []

    for app in db.query(models.Application).filter(
        models.Application.student_id == student.id,
        models.Application.status != models.ApplicationStatus.withdrawn,
    ).order_by(models.Application.applied_at.desc()):
        items.append(schemas.StudentApplicationItem(
            id=app.id,
            application_type="opportunity",
            status=app.status.value,
            applied_at=app.applied_at,
            title=app.opportunity.title,
            company_name=app.opportunity.company,
            location=app.opportunity.location,
            job_id=app.opportunity_id,
            can_withdraw=app.status == models.ApplicationStatus.applied,
        ))

    for app in db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.student_id == student.id,
        cm.CompanyApplication.status != cm.CompanyApplicationStatus.withdrawn,
    ).order_by(cm.CompanyApplication.applied_at.desc()):
        job = app.job
        deadline_passed = False
        if job and job.deadline:
            try:
                deadline_passed = datetime.strptime(job.deadline, "%Y-%m-%d").date() < datetime.utcnow().date()
            except ValueError:
                pass
        items.append(schemas.StudentApplicationItem(
            id=app.id,
            application_type="company_job",
            status=app.status.value,
            applied_at=app.applied_at,
            title=job.title if job else "Unknown",
            company_name=job.company.name if job and job.company else "Company",
            location=job.location if job else "",
            job_id=app.job_id,
            can_withdraw=app.status == cm.CompanyApplicationStatus.applied and not deadline_passed,
        ))

    items.sort(key=lambda x: x.applied_at, reverse=True)
    return items


@app.get("/applications", response_model=List[schemas.ApplicationOut], tags=["Admin"])
def get_all_applications(db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """Admin: Get all applications across all students."""
    return db.query(models.Application).order_by(
        models.Application.applied_at.desc()
    ).all()


@app.put("/applications/{application_id}/status", response_model=schemas.ApplicationOut, tags=["Admin"])
def update_application_status(
    application_id: int,
    status_update: schemas.ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Admin: Update the status of an application."""
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status
    application.status = status_update.status
    db.commit()
    db.refresh(application)

    if status_update.status in ["Selected", "Rejected"] and old_status != status_update.status:
        notify_student(
            db, application.student_id,
            f"Application Update: {status_update.status}",
            f"Your application for {application.opportunity.title} is now {status_update.status}.",
        )
        try:
            send_status_update_email(
                to_email=application.student.college_email,
                student_name=application.student.full_name,
                job_title=application.opportunity.title,
                company=application.opportunity.company,
                status=status_update.status
            )
        except Exception as e:
            print(f"[Email] Failed to send status update: {e}")

    log_audit(
        db,
        actor_type="admin",
        actor_email=user.get("sub"),
        action="application_status_changed",
        resource_type="opportunity_application",
        resource_id=application.id,
        details=f"{old_status.value} -> {status_update.status.value}",
    )

    return application


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(company_router)
app.include_router(admin_router)
app.include_router(password_reset_router)
app.include_router(notification_router)


# ─── Saved Jobs ───────────────────────────────────────────────────────────────

def _resolve_saved_job(db: Session, source: str, job_id: int) -> Optional[dict]:
    if source == "opportunity":
        opp = db.query(models.Opportunity).filter(models.Opportunity.id == job_id).first()
        return normalize_opportunity(opp) if opp else None
    if source == "company_job":
        job = db.query(company_models.CompanyJob).filter(
            company_models.CompanyJob.id == job_id,
            company_models.CompanyJob.status == company_models.JobStatus.active,
        ).first()
        return normalize_company_job(job) if job else None
    return None


@app.get("/students/me/saved-jobs", response_model=List[schemas.SavedJobOut], tags=["Students"])
def get_saved_jobs(
    student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    saved = db.query(models.SavedJob).filter(
        models.SavedJob.student_id == student.id
    ).order_by(models.SavedJob.saved_at.desc()).all()

    result = []
    for s in saved:
        job_data = _resolve_saved_job(db, s.job_source, s.job_id)
        result.append(schemas.SavedJobOut(
            id=s.id,
            job_source=s.job_source,
            job_id=s.job_id,
            saved_at=s.saved_at,
            job=job_data,
        ))
    return result


@app.post("/students/me/saved-jobs", tags=["Students"])
def save_job(
    data: schemas.SaveJobRequest,
    student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if data.job_source not in ("opportunity", "company_job"):
        raise HTTPException(status_code=422, detail="Invalid job source")

    job_data = _resolve_saved_job(db, data.job_source, data.job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(models.SavedJob).filter(
        models.SavedJob.student_id == student.id,
        models.SavedJob.job_source == data.job_source,
        models.SavedJob.job_id == data.job_id,
    ).first()
    if existing:
        return {"message": "Job already saved", "id": existing.id}

    saved = models.SavedJob(
        student_id=student.id,
        job_source=data.job_source,
        job_id=data.job_id,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return {"message": "Job saved", "id": saved.id}


@app.delete("/students/me/saved-jobs/{saved_id}", tags=["Students"])
def unsave_job(
    saved_id: int,
    student: models.Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    saved = db.query(models.SavedJob).filter(
        models.SavedJob.id == saved_id,
        models.SavedJob.student_id == student.id,
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved job not found")
    db.delete(saved)
    db.commit()
    return {"message": "Job removed from saved list"}

@app.get("/company-jobs", response_model=List[company_schemas.JobOut], tags=["Public"])
def list_company_jobs(
    search : Optional[str] = Query(None),
    type   : Optional[str] = Query(None),
    db     : Session = Depends(get_db)
):
    """All active company jobs — shown on student browse page."""
    import company_models as cm
    query = db.query(cm.CompanyJob).filter(cm.CompanyJob.status == cm.JobStatus.active)
    if search:
        query = query.filter(cm.CompanyJob.title.ilike(f"%{search}%"))
    if type:
        type_map = {
            "job": [
                cm.EmploymentType.full_time,
                cm.EmploymentType.part_time,
                cm.EmploymentType.contract,
                cm.EmploymentType.remote,
            ],
            "internship": [cm.EmploymentType.internship],
        }
        if type in type_map:
            query = query.filter(cm.CompanyJob.employment_type.in_(type_map[type]))
    return query.order_by(cm.CompanyJob.created_at.desc()).all()


@app.get("/company-jobs/{job_id}", response_model=company_schemas.JobOut, tags=["Public"])
def get_company_job(job_id: int, db: Session = Depends(get_db)):
    """Public detail page for a single active company job."""
    import company_models as cm
    job = db.query(cm.CompanyJob).filter(
        cm.CompanyJob.id == job_id,
        cm.CompanyJob.status == cm.JobStatus.active,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get(
    "/company-jobs/{job_id}/application-status",
    response_model=schemas.CompanyJobApplicationStatus,
    tags=["Public"],
)
def get_company_job_application_status(
    job_id: int,
    db: Session = Depends(get_db),
    user: Optional[dict] = Depends(get_optional_user),
):
    """Check whether the current student has applied to this company job."""
    if not user or user.get("role") != "student":
        return schemas.CompanyJobApplicationStatus(applied=False)

    import company_models as cm
    student_id = get_student_id_from_user(user, db)
    app = db.query(cm.CompanyApplication).filter(
        cm.CompanyApplication.job_id == job_id,
        cm.CompanyApplication.student_id == student_id,
        cm.CompanyApplication.status != cm.CompanyApplicationStatus.withdrawn,
    ).first()
    if not app:
        return schemas.CompanyJobApplicationStatus(applied=False)
    return schemas.CompanyJobApplicationStatus(
        applied=True,
        application_id=app.id,
        status=app.status.value,
    )


# ─── Root ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["General"])
def root():
    return {"message": "Welcome to Aspire API 🚀", "docs": "/docs"}
