"""
main.py - FastAPI application entry point
All routes for opportunities, students, applications, and admin
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from email_service import (
    generate_otp, send_otp_email,
    send_application_received_email,
    send_status_update_email
)
from otp_store import save_otp, verify_otp, get_otp_name
from auth import create_token, require_admin
from config import ADMIN_EMAIL, ADMIN_PASSWORD

from company_models import Base as CompanyBase
import company_models
from company_routes import router as company_router
from admin_routes import router as admin_router
from password_reset_routes import router as password_reset_router
import password_reset_models

import models
import schemas
from database import engine, get_db
import company_schemas

# Create all tables in the database
models.Base.metadata.create_all(bind=engine)
company_models.Base.metadata.create_all(bind=engine)
password_reset_models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Aspire API",
    description="Backend API for Aspire Job & Internship Platform",
    version="1.0.0"
)

# Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Seed Data Helper ─────────────────────────────────────────────────────────

def seed_data(db: Session):
    """Add sample data if the database is empty."""
    if db.query(models.Opportunity).count() > 0:
        return

    sample_opportunities = [
        {
            "title": "Frontend Developer Intern",
            "company": "TechNova Solutions",
            "description": "Join our dynamic frontend team to build modern web applications using React.js. You'll work closely with senior developers, contribute to real projects, and learn industry best practices in a collaborative environment.",
            "skills": "React.js, JavaScript, HTML, CSS, Git",
            "location": "Bengaluru, Karnataka",
            "stipend": "₹15,000/month",
            "type": "internship",
            "logo": "🚀"
        },
        {
            "title": "Backend Engineer",
            "company": "DataStream Inc.",
            "description": "We're looking for a backend engineer to design and build scalable REST APIs. You'll work with Python, FastAPI, and PostgreSQL to power our data analytics platform used by 500+ enterprises.",
            "skills": "Python, FastAPI, PostgreSQL, Docker, AWS",
            "location": "Hyderabad, Telangana",
            "stipend": "₹12 LPA",
            "type": "job",
            "logo": "💡"
        },
        {
            "title": "Data Science Intern",
            "company": "Insightful Analytics",
            "description": "Work on real-world data problems using machine learning and statistical models. You'll analyze large datasets, build predictive models, and present findings to stakeholders.",
            "skills": "Python, Pandas, Scikit-learn, SQL, Matplotlib",
            "location": "Pune, Maharashtra (Remote)",
            "stipend": "₹20,000/month",
            "type": "internship",
            "logo": "📊"
        },
        {
            "title": "Full Stack Developer",
            "company": "BuildFast Technologies",
            "description": "Own end-to-end development of features for our SaaS product. You'll architect solutions, write clean code, and collaborate with product and design teams to ship delightful user experiences.",
            "skills": "React.js, Node.js, MongoDB, Express, TypeScript",
            "location": "Mumbai, Maharashtra",
            "stipend": "₹18 LPA",
            "type": "job",
            "logo": "⚡"
        },
        {
            "title": "UI/UX Design Intern",
            "company": "CreativeMinds Studio",
            "description": "Help shape the visual identity and user experience of products used by millions. You'll create wireframes, prototypes, and high-fidelity designs, and conduct user research to validate your ideas.",
            "skills": "Figma, Adobe XD, User Research, Prototyping",
            "location": "Chennai, Tamil Nadu",
            "stipend": "₹12,000/month",
            "type": "internship",
            "logo": "🎨"
        },
        {
            "title": "DevOps Engineer",
            "company": "CloudForge Systems",
            "description": "Build and maintain our cloud infrastructure on AWS. You'll automate deployments, monitor system health, optimize costs, and ensure 99.9% uptime for our globally distributed services.",
            "skills": "AWS, Kubernetes, Docker, Terraform, CI/CD",
            "location": "Noida, Uttar Pradesh",
            "stipend": "₹22 LPA",
            "type": "job",
            "logo": "☁️"
        },
        {
            "title": "Machine Learning Intern",
            "company": "NeuralPath AI",
            "description": "Work alongside ML researchers to build and deploy AI models. Projects span NLP, computer vision, and recommendation systems. Ideal for students passionate about cutting-edge AI research.",
            "skills": "Python, TensorFlow, PyTorch, NLP, Computer Vision",
            "location": "Remote",
            "stipend": "₹25,000/month",
            "type": "internship",
            "logo": "🤖"
        },
        {
            "title": "Android Developer",
            "company": "MobileFirst Apps",
            "description": "Build next-generation Android applications for millions of users. You'll own features from design to deployment, work in an agile team, and shape the mobile experience for our growing user base.",
            "skills": "Kotlin, Android SDK, Jetpack Compose, Firebase",
            "location": "Delhi NCR",
            "stipend": "₹10 LPA",
            "type": "job",
            "logo": "📱"
        },
    ]

    for opp in sample_opportunities:
        db_opp = models.Opportunity(**opp)
        db.add(db_opp)
    db.commit()


# Seed on startup
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    seed_data(db)


# ─── Stats ────────────────────────────────────────────────────────────────────

@app.get("/stats", response_model=schemas.StatsOut, tags=["General"])
def get_stats(db: Session = Depends(get_db)):
    """Return platform-wide statistics for the home page."""
    total_jobs = db.query(models.Opportunity).filter(
        models.Opportunity.type == models.OpportunityType.job
    ).count()
    total_internships = db.query(models.Opportunity).filter(
        models.Opportunity.type == models.OpportunityType.internship
    ).count()
    total_companies = db.query(models.Opportunity.company).distinct().count()
    total_applications = db.query(models.Application).count()

    return schemas.StatsOut(
        total_jobs=total_jobs,
        total_internships=total_internships,
        total_companies=total_companies,
        total_applications=total_applications
    )


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

@app.post("/students", response_model=schemas.StudentOut, tags=["Students"])
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    """Register a new student or update existing profile."""
    existing = db.query(models.Student).filter(models.Student.email == student.email).first()
    if existing:
        existing.name = student.name
        existing.college = student.college
        existing.branch = student.branch
        existing.year = student.year
        existing.skills = student.skills
        db.commit()
        db.refresh(existing)
        return existing
    db_student = models.Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@app.get("/students/{student_id}", response_model=schemas.StudentOut, tags=["Students"])
def get_student(student_id: int, db: Session = Depends(get_db)):
    """Get a student's profile by ID."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@app.get("/students/email/{email}", response_model=schemas.StudentOut, tags=["Students"])
def get_student_by_email(email: str, db: Session = Depends(get_db)):
    """Find a student by their email address."""
    student = db.query(models.Student).filter(models.Student.email == email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


# ─── Applications ─────────────────────────────────────────────────────────────

@app.post("/applications", response_model=schemas.ApplicationOut, tags=["Applications"])
def apply_to_opportunity(app_data: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    """Student applies to an opportunity."""
    student = db.query(models.Student).filter(models.Student.id == app_data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    opp = db.query(models.Opportunity).filter(models.Opportunity.id == app_data.opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    existing = db.query(models.Application).filter(
        models.Application.student_id == app_data.student_id,
        models.Application.opportunity_id == app_data.opportunity_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this opportunity")

    new_app = models.Application(**app_data.dict())
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    try:
        send_application_received_email(
            to_email=student.email,
            student_name=student.name,
            job_title=opp.title,
            company=opp.company
        )
    except Exception as e:
        print(f"[Email] Failed to send application confirmation: {e}")

    return new_app


@app.get("/applications/student/{student_id}", response_model=List[schemas.ApplicationOut], tags=["Applications"])
def get_student_applications(student_id: int, db: Session = Depends(get_db)):
    """Get all applications submitted by a specific student."""
    return db.query(models.Application).filter(
        models.Application.student_id == student_id
    ).order_by(models.Application.applied_at.desc()).all()


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
        try:
            send_status_update_email(
                to_email=application.student.email,
                student_name=application.student.name,
                job_title=application.opportunity.title,
                company=application.opportunity.company,
                status=status_update.status
            )
        except Exception as e:
            print(f"[Email] Failed to send status update: {e}")

    return application


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/admin-login", response_model=schemas.TokenOut, tags=["Auth"])
def admin_login(request: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    """Admin login with email + password. Returns JWT with role=admin."""
    if request.email != ADMIN_EMAIL or request.name != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    token = create_token({"sub": request.email, "role": "admin"})
    return schemas.TokenOut(access_token=token, role="admin")


@app.post("/auth/login", response_model=schemas.TokenOut, tags=["Auth"])
def student_login(request: schemas.SendOTPRequest, db: Session = Depends(get_db)):
    """Initiate login: sends OTP to email."""
    otp = generate_otp()
    save_otp(request.email, otp, request.name)
    success = send_otp_email(request.email, otp, request.name or "Student")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Check Gmail config.")
    return schemas.TokenOut(access_token="", student_id=None)


@app.post("/auth/send-otp", tags=["Auth"])
def send_otp_route(request: schemas.SendOTPRequest):
    """Send a 6-digit OTP to the user's email. Expires in 5 minutes."""
    otp = generate_otp()
    save_otp(request.email, otp, request.name)
    success = send_otp_email(request.email, otp, request.name or "Student")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Check your Gmail config.")
    return {"message": "OTP sent successfully. Check your email."}


@app.post("/auth/verify-otp", response_model=schemas.TokenOut, tags=["Auth"])
def verify_otp_route(request: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and return JWT token."""
    if not verify_otp(request.email, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    student = db.query(models.Student).filter(models.Student.email == request.email).first()

    if student:
        # Existing student: mark as verified
        student.is_verified = 1
        db.commit()
        db.refresh(student)
    else:
        # New student: auto-create account on first OTP verification
        name = get_otp_name(request.email) or "Student"
        student = models.Student(
            name=name,
            email=request.email,
            college="",
            branch="",
            year="",
            is_verified=1
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    student_id = student.id
    token = create_token({"sub": request.email, "role": "student"})
    return schemas.TokenOut(access_token=token, student_id=student_id, role="student")


# ─── Public Company Jobs (visible to students) ────────────────────────────────

@app.get("/company-jobs", response_model=List[company_schemas.JobOut], tags=["Public"])
def list_company_jobs(
    search : Optional[str] = Query(None),
    type   : Optional[str] = Query(None),
    db     : Session = Depends(get_db)
):
    """All active company jobs — shown on student browse page."""
    import company_models as cm
    import company_schemas
    query = db.query(cm.CompanyJob).filter(cm.CompanyJob.status == cm.JobStatus.active)
    if search:
        query = query.filter(cm.CompanyJob.title.ilike(f"%{search}%"))
    if type:
        query = query.filter(cm.CompanyJob.employment_type == type)
    return query.order_by(cm.CompanyJob.created_at.desc()).all()

app.include_router(company_router)
app.include_router(admin_router)
app.include_router(password_reset_router)


# ─── Root ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["General"])
def root():
    return {"message": "Welcome to Aspire API 🚀", "docs": "/docs"}