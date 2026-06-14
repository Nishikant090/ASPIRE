"""
schemas.py - Pydantic models for request/response validation
Defines what data looks like coming in and going out of the API
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OpportunityType(str, Enum):
    job = "job"
    internship = "internship"


class ApplicationStatus(str, Enum):
    applied = "Applied"
    under_review = "Under Review"
    selected = "Selected"
    rejected = "Rejected"


# ─── Opportunity Schemas ──────────────────────────────────────────────────────

class OpportunityBase(BaseModel):
    title: str
    company: str
    description: str
    skills: str
    location: str
    stipend: str
    type: OpportunityType
    logo: Optional[str] = "🏢"


class OpportunityCreate(OpportunityBase):
    """Schema for creating a new opportunity."""
    pass


class OpportunityUpdate(BaseModel):
    """Schema for updating an opportunity (all fields optional)."""
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[str] = None
    location: Optional[str] = None
    stipend: Optional[str] = None
    type: Optional[OpportunityType] = None
    logo: Optional[str] = None


class OpportunityOut(OpportunityBase):
    """Schema for returning opportunity data to the client."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Allows reading from ORM objects


# ─── Student Schemas ──────────────────────────────────────────────────────────

class StudentBase(BaseModel):
    name: str
    email: str
    college: str
    branch: str
    year: str
    skills: Optional[str] = ""


class StudentCreate(StudentBase):
    """Schema for creating/registering a student."""
    pass


class StudentOut(StudentBase):
    """Schema for returning student data."""
    id: int
    is_verified: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Application Schemas ──────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    """Schema for submitting an application."""
    student_id: int
    opportunity_id: int
    cover_note: Optional[str] = ""


class ApplicationStatusUpdate(BaseModel):
    """Schema for admin to update application status."""
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    """Schema for returning application data with nested details."""
    id: int
    status: ApplicationStatus
    applied_at: datetime
    cover_note: Optional[str]
    student: StudentOut
    opportunity: OpportunityOut

    class Config:
        from_attributes = True


# ─── Stats Schema ─────────────────────────────────────────────────────────────

class StatsOut(BaseModel):
    total_jobs: int
    total_internships: int
    total_companies: int
    total_applications: int

# ─── OTP / Auth Schemas ───────────────────────────────────────────────────────

class SendOTPRequest(BaseModel):
    """Request to send OTP — just needs email and optional name."""
    email: str
    name: Optional[str] = ""

class VerifyOTPRequest(BaseModel):
    """Request to verify OTP entered by the user."""
    email: str
    otp: str

class TokenOut(BaseModel):
    """JWT token returned after successful login/verify."""
    access_token: str
    token_type: str = "bearer"
    student_id: Optional[int] = None
    role: str = "student"
