"""
models.py - SQLAlchemy ORM models for Aspire platform
Defines the core student, opportunity, and application database models.
"""

import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Index, UniqueConstraint, event
from sqlalchemy.orm import relationship
from database import Base


class OpportunityType(str, enum.Enum):
    job = "job"
    internship = "internship"


class ApplicationStatus(str, enum.Enum):
    applied = "Applied"
    under_review = "Under Review"
    shortlisted = "Shortlisted"
    interview_scheduled = "Interview Scheduled"
    selected = "Selected"
    rejected = "Rejected"
    withdrawn = "Withdrawn"


class StudentStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    blocked = "blocked"


class Opportunity(Base):
    """Represents a public job or internship listing."""
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    skills = Column(String(500), nullable=False)
    location = Column(String(200), nullable=False)
    stipend = Column(String(100), nullable=False)
    type = Column(Enum(OpportunityType), nullable=False)
    logo = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    applications = relationship("Application", back_populates="opportunity", cascade="all, delete-orphan")


class Student(Base):
    """Represents a student account (verified after email confirmation)."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    username = Column(String(100), unique=True, nullable=True, index=True)
    personal_email = Column(String(200), unique=True, nullable=False, index=True)
    college_email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(500), nullable=False)
    college_name = Column(String(200), nullable=False)
    branch = Column(String(100), nullable=True, default="")
    year = Column(String(50), nullable=True, default="")
    semester = Column(String(50), nullable=True)
    graduation_year = Column(String(20), nullable=True)
    roll_number = Column(String(100), nullable=True)
    skills = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    resume_path = Column(String(500), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    tnp_head_name = Column(String(200), nullable=False)
    tnp_head_phone = Column(String(50), nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    is_college_email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(Enum(StudentStatus), default=StudentStatus.pending, nullable=False)
    verification_expires_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Legacy columns from the original SQLite schema (kept in sync automatically)
    legacy_name = Column("name", String(100), nullable=False, default="")
    legacy_email = Column("email", String(200), nullable=False, default="")
    legacy_college = Column("college", String(200), nullable=False, default="")
    legacy_is_verified = Column("is_verified", Integer, default=0)

    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    company_applications = relationship("CompanyApplication", back_populates="student")

    __table_args__ = (
        Index("ix_students_personal_email", "personal_email"),
        Index("ix_students_college_email", "college_email"),
    )

    @property
    def name(self):
        return self.full_name

    @property
    def email(self):
        return self.college_email

    @property
    def college(self):
        return self.college_name

    @property
    def is_verified(self):
        return 1 if self.is_college_email_verified else 0

    @property
    def is_fully_verified(self):
        return self.is_college_email_verified


class Application(Base):
    """Tracks student applications to public opportunities."""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    cover_note = Column(Text, nullable=True)

    student = relationship("Student", back_populates="applications")
    opportunity = relationship("Opportunity", back_populates="applications")


class SavedJob(Base):
    """Student saved/bookmarked jobs from either source."""
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    job_source = Column(String(20), nullable=False)  # opportunity | company_job
    job_id = Column(Integer, nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", backref="saved_jobs")

    __table_args__ = (
        UniqueConstraint("student_id", "job_source", "job_id", name="uq_saved_job"),
    )


@event.listens_for(Student, "before_insert")
@event.listens_for(Student, "before_update")
def _sync_student_legacy_columns(mapper, connection, target):
    """Keep legacy name/email/college columns populated for older SQLite schemas."""
    target.legacy_name = target.full_name or target.legacy_name or ""
    target.legacy_email = target.college_email or target.personal_email or target.legacy_email or ""
    target.legacy_college = target.college_name or target.legacy_college or ""
    target.legacy_is_verified = 1 if target.is_college_email_verified else 0
