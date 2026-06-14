"""
company_schemas.py - Pydantic schemas for Company Portal
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CompanyStatus(str, Enum):
    pending   = "pending"
    approved  = "approved"
    rejected  = "rejected"
    suspended = "suspended"


class JobStatus(str, Enum):
    active = "active"
    closed = "closed"


class EmploymentType(str, Enum):
    internship = "internship"
    full_time  = "full_time"
    part_time  = "part_time"
    contract   = "contract"
    remote     = "remote"


class CompanyApplicationStatus(str, Enum):
    applied             = "Applied"
    under_review        = "Under Review"
    shortlisted         = "Shortlisted"
    interview_scheduled = "Interview Scheduled"
    selected            = "Selected"
    rejected            = "Rejected"


# ─── Company Schemas ──────────────────────────────────────────────────────────

class CompanyRegister(BaseModel):
    """Required fields for company registration."""
    name        : str
    email       : str
    password    : str
    website     : Optional[str] = ""
    industry    : Optional[str] = ""
    description : Optional[str] = ""
    logo        : Optional[str] = "🏢"
    location    : Optional[str] = ""


class CompanyLogin(BaseModel):
    email    : str
    password : str


class CompanyOut(BaseModel):
    id          : int
    name        : str
    email       : str
    website     : Optional[str]
    industry    : Optional[str]
    description : Optional[str]
    logo        : Optional[str]
    location    : Optional[str]
    status      : CompanyStatus
    created_at  : datetime

    class Config:
        from_attributes = True


class CompanyUpdate(BaseModel):
    """All optional — company can update any profile field."""
    name        : Optional[str] = None
    website     : Optional[str] = None
    industry    : Optional[str] = None
    description : Optional[str] = None
    logo        : Optional[str] = None
    location    : Optional[str] = None


# ─── Job Schemas ──────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title           : str
    description     : str
    skills          : str
    salary          : str
    location        : str
    employment_type : EmploymentType
    eligibility     : Optional[str] = ""
    deadline        : Optional[str] = ""
    openings        : Optional[int] = 1


class JobUpdate(BaseModel):
    title           : Optional[str] = None
    description     : Optional[str] = None
    skills          : Optional[str] = None
    salary          : Optional[str] = None
    location        : Optional[str] = None
    employment_type : Optional[EmploymentType] = None
    eligibility     : Optional[str] = None
    deadline        : Optional[str] = None
    openings        : Optional[int] = None
    status          : Optional[JobStatus] = None


class StudentBasic(BaseModel):
    """Student info shown to company in applicant list."""
    id      : int
    name    : str
    email   : str
    college : str
    branch  : str
    skills  : Optional[str]

    class Config:
        from_attributes = True


class CompanyApplicationOut(BaseModel):
    id          : int
    status      : CompanyApplicationStatus
    applied_at  : datetime
    cover_note  : Optional[str]
    resume_path : Optional[str]
    student     : StudentBasic

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id              : int
    company_id      : int
    title           : str
    description     : str
    skills          : str
    eligibility     : Optional[str]
    salary          : str
    location        : str
    employment_type : EmploymentType
    deadline        : Optional[str]
    openings        : Optional[int]
    status          : JobStatus
    created_at      : datetime
    company         : Optional[CompanyOut] = None

    class Config:
        from_attributes = True


class AppStatusUpdate(BaseModel):
    status : CompanyApplicationStatus


# ─── Admin Schemas ────────────────────────────────────────────────────────────

class CompanyStatusUpdate(BaseModel):
    status : CompanyStatus


class AdminStatsOut(BaseModel):
    total_students          : int
    total_companies         : int
    total_jobs              : int
    total_applications      : int
    active_companies        : int
    pending_approvals       : int


# ─── Token ────────────────────────────────────────────────────────────────────

class CompanyTokenOut(BaseModel):
    access_token : str
    token_type   : str = "bearer"
    company_id   : int
    role         : str = "company"