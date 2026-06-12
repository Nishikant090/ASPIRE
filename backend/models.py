"""
models.py - SQLAlchemy ORM models for Aspire platform
Defines the database tables: Opportunity, Student, Application
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class OpportunityType(str, enum.Enum):
    job = "job"
    internship = "internship"


class ApplicationStatus(str, enum.Enum):
    applied = "Applied"
    under_review = "Under Review"
    selected = "Selected"
    rejected = "Rejected"


class Opportunity(Base):
    """Represents a job or internship listing."""
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    company = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    skills = Column(String(500), nullable=False)       # comma-separated skills
    location = Column(String(200), nullable=False)
    stipend = Column(String(100), nullable=False)       # e.g. "₹15,000/month" or "₹8 LPA"
    type = Column(Enum(OpportunityType), nullable=False)
    logo = Column(String(10), nullable=True)            # emoji placeholder for company logo
    created_at = Column(DateTime, default=datetime.utcnow)

    # One opportunity → many applications
    applications = relationship("Application", back_populates="opportunity", cascade="all, delete-orphan")


class Student(Base):
    """Represents a student user."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    college = Column(String(200), nullable=False)
    branch = Column(String(100), nullable=False)
    year = Column(String(20), nullable=False)
    skills = Column(String(500), nullable=True)

    # One student → many applications
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")


class Application(Base):
    """Tracks which student applied to which opportunity."""
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied)
    applied_at = Column(DateTime, default=datetime.utcnow)
    cover_note = Column(Text, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="applications")
    opportunity = relationship("Opportunity", back_populates="applications")
