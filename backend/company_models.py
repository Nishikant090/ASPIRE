"""
company_models.py - Database models for Company Portal
Company, CompanyJob, CompanyApplication, Resume
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class CompanyStatus(str, enum.Enum):
    pending   = "pending"
    approved  = "approved"
    rejected  = "rejected"
    suspended = "suspended"


class JobStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class EmploymentType(str, enum.Enum):
    internship = "internship"
    full_time  = "full_time"
    part_time  = "part_time"
    contract   = "contract"
    remote     = "remote"


class CompanyApplicationStatus(str, enum.Enum):
    applied            = "Applied"
    under_review       = "Under Review"
    shortlisted        = "Shortlisted"
    interview_scheduled = "Interview Scheduled"
    selected           = "Selected"
    rejected           = "Rejected"


class Company(Base):
    """Company account — must be approved by admin before posting jobs."""
    __tablename__ = "companies"

    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(200), nullable=False)
    email            = Column(String(200), unique=True, nullable=False)
    password_hash    = Column(String(500), nullable=False)
    website          = Column(String(300), nullable=True)      # optional
    industry         = Column(String(100), nullable=True)      # optional
    description      = Column(Text, nullable=True)             # optional
    logo             = Column(String(10), nullable=True, default="🏢")
    location         = Column(String(200), nullable=True)      # optional
    status           = Column(Enum(CompanyStatus), default=CompanyStatus.pending)
    created_at       = Column(DateTime, default=datetime.utcnow)

    # Relationships
    jobs             = relationship("CompanyJob", back_populates="company", cascade="all, delete-orphan")


class CompanyJob(Base):
    """Job posted by a company."""
    __tablename__ = "company_jobs"

    id                  = Column(Integer, primary_key=True, index=True)
    company_id          = Column(Integer, ForeignKey("companies.id"), nullable=False)
    title               = Column(String(200), nullable=False)
    description         = Column(Text, nullable=False)
    skills              = Column(String(500), nullable=False)
    eligibility         = Column(String(500), nullable=True)   # optional
    salary              = Column(String(100), nullable=False)
    location            = Column(String(200), nullable=False)
    employment_type     = Column(Enum(EmploymentType), nullable=False)
    deadline            = Column(String(50), nullable=True)    # optional e.g. "2025-08-31"
    openings            = Column(Integer, nullable=True, default=1)  # optional
    status              = Column(Enum(JobStatus), default=JobStatus.active)
    created_at          = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company             = relationship("Company", back_populates="jobs")
    applications        = relationship("CompanyApplication", back_populates="job", cascade="all, delete-orphan")


class CompanyApplication(Base):
    """Student application to a company job."""
    __tablename__ = "company_applications"

    id              = Column(Integer, primary_key=True, index=True)
    job_id          = Column(Integer, ForeignKey("company_jobs.id"), nullable=False)
    student_id      = Column(Integer, ForeignKey("students.id"), nullable=False)
    status          = Column(Enum(CompanyApplicationStatus), default=CompanyApplicationStatus.applied)
    cover_note      = Column(Text, nullable=True)
    resume_path     = Column(String(500), nullable=True)   # file path after upload
    applied_at      = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job             = relationship("CompanyJob", back_populates="applications")
    student         = relationship("Student")