"""
schemas.py - Pydantic models for request/response validation
Defines what data looks like coming in and going out of the API
"""

from pydantic import BaseModel, EmailStr, model_validator, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from password_reset_utils import validate_password


class OpportunityType(str, Enum):
    job = "job"
    internship = "internship"


class ApplicationStatus(str, Enum):
    applied = "Applied"
    under_review = "Under Review"
    shortlisted = "Shortlisted"
    interview_scheduled = "Interview Scheduled"
    selected = "Selected"
    rejected = "Rejected"
    withdrawn = "Withdrawn"


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

class StudentStatus(str, Enum):
    pending = "pending"
    active = "active"
    blocked = "blocked"

class StudentRegister(BaseModel):
    """One-time student registration — college email only."""
    full_name: str
    college_name: str
    college_email: EmailStr
    password: str
    confirm_password: str
    tnp_head_name: str
    tnp_head_phone: str
    branch: Optional[str] = ""
    cgpa: Optional[str] = None
    graduation_year: Optional[str] = None
    year: Optional[str] = None
    roll_number: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_path: Optional[str] = None
    skills: Optional[str] = ""
    portfolio_url: Optional[str] = None
    profile_picture: Optional[str] = None
    username: Optional[str] = None

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        valid, message = validate_password(self.password)
        if not valid:
            raise ValueError(message)
        return self

    @field_validator("college_email")
    @classmethod
    def normalize_college_email(cls, value: str) -> str:
        return value.strip().lower()


class StudentRegisterLegacy(BaseModel):
    """Backward-compatible registration used by older clients."""
    full_name: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    college_email: Optional[EmailStr] = None
    password: Optional[str] = None
    college_name: Optional[str] = None
    branch: str = ""
    year: str = ""
    skills: Optional[str] = ""
    tnp_head_name: Optional[str] = ""
    tnp_head_phone: Optional[str] = ""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None


class StudentLogin(BaseModel):
    """Login with college email + password."""
    college_email: EmailStr
    password: str

    @field_validator("college_email")
    @classmethod
    def normalize_college_email(cls, value: str) -> str:
        return value.strip().lower()


class StudentLoginLegacy(BaseModel):
    email: EmailStr
    password: str


class StudentOut(BaseModel):
    id: int
    full_name: str
    username: Optional[str] = None
    college_email: EmailStr
    college_name: str
    name: str
    email: EmailStr
    college: str
    branch: Optional[str] = ""
    year: Optional[str] = ""
    semester: Optional[str] = None
    graduation_year: Optional[str] = None
    roll_number: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    resume_path: Optional[str] = None
    profile_picture: Optional[str] = None
    skills: Optional[str] = ""
    tnp_head_name: str
    tnp_head_phone: str
    is_email_verified: bool
    is_college_email_verified: bool = False
    is_verified: int
    status: StudentStatus
    created_at: datetime

    class Config:
        from_attributes = True


class StudentBasic(BaseModel):
    id: int
    full_name: str
    college_email: EmailStr
    college_name: str
    name: str
    email: EmailStr
    college: str
    branch: str
    skills: Optional[str] = None

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
    company_id: Optional[int] = None
    role: str = "student"
    email: Optional[str] = None


class RegisterOut(BaseModel):
    """Response after registration — verification required before login."""
    message: str
    student_id: int
    college_email: EmailStr
    verification_required: bool = True
    verification_expires_at: Optional[datetime] = None


class VerificationStatusOut(BaseModel):
    student_id: int
    college_email: EmailStr
    is_college_email_verified: bool
    is_fully_verified: bool
    status: StudentStatus
    verification_expires_at: Optional[datetime] = None
    is_expired: bool = False
    resend_cooldown_seconds: int = 0
    can_resend: bool = True


class CompanyVerificationStatusOut(BaseModel):
    company_id: int
    email: EmailStr
    is_email_verified: bool
    status: str
    verification_expires_at: Optional[datetime] = None
    is_expired: bool = False
    resend_cooldown_seconds: int = 0
    can_resend: bool = True


class SendVerificationRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ConfirmVerificationRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthMeOut(BaseModel):
    role: str
    email: Optional[str] = None
    student_id: Optional[int] = None
    company_id: Optional[int] = None
    profile: Optional[dict] = None


class StudentApplicationItem(BaseModel):
    """Unified application view for student dashboard."""
    id: int
    application_type: str  # "opportunity" | "company_job"
    status: str
    applied_at: datetime
    title: str
    company_name: str
    location: str
    job_id: int
    can_withdraw: bool = False

    class Config:
        from_attributes = True


class CompanyJobApplicationStatus(BaseModel):
    applied: bool
    application_id: Optional[int] = None
    status: Optional[str] = None


class UnifiedJobOut(BaseModel):
    """Normalized job from opportunities or company_jobs."""
    id: int
    source: str
    unique_key: str
    title: str
    company: str
    company_name: str
    description: str
    skills: str
    location: str
    stipend: str
    salary: str
    type: str
    employment_type: str
    logo: str = "🏢"
    created_at: Optional[str] = None
    deadline: Optional[str] = None
    company_id: Optional[int] = None
    openings: Optional[int] = None
    status: Optional[str] = None


class SavedJobOut(BaseModel):
    id: int
    job_source: str
    job_id: int
    saved_at: datetime
    job: Optional[UnifiedJobOut] = None

    class Config:
        from_attributes = True


class SaveJobRequest(BaseModel):
    job_source: str  # opportunity | company_job
    job_id: int
