"""
password_reset_routes.py - Forgot/Reset password API routes
Handles both Student and Company flows
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime

from database import get_db
import models
import company_models as cm
import password_reset_models as prm
from password_reset_utils import (
    generate_otp, create_reset_token, get_valid_token,
    validate_password, check_rate_limit, record_rate_limit,
    log_action, invalidate_existing_tokens
)
from password_reset_email import send_password_reset_email, send_password_changed_email

router = APIRouter(prefix="/auth", tags=["Password Reset"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email        : str
    otp          : str
    new_password : str


class ValidateOTPRequest(BaseModel):
    """Optional: check OTP is valid before showing new password form."""
    email: str
    otp  : str


# ─── Helper: get client IP ────────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── STANDARD SAFE RESPONSE ──────────────────────────────────────────────────
# Always return this — never reveal whether email exists
SAFE_RESPONSE = {"message": "If an account exists, reset instructions have been sent."}


# ─── Student Forgot Password ──────────────────────────────────────────────────

@router.post("/student/forgot-password")
def student_forgot_password(
    data    : ForgotPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    # Rate limit check
    allowed, msg = check_rate_limit(data.email, ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    record_rate_limit(data.email, ip)

    # Lookup student — but NEVER reveal if not found
    student = db.query(models.Student).filter(
        models.Student.email == data.email
    ).first()

    log_action(data.email, "student", "requested", ip, db)

    if student:
        otp = generate_otp()
        create_reset_token(data.email, "student", otp, db)
        try:
            send_password_reset_email(data.email, otp, "student")
        except Exception as e:
            print(f"[Email] Failed to send reset email: {e}")

    # Always return same message — security: don't reveal email existence
    return SAFE_RESPONSE


@router.post("/student/validate-otp")
def student_validate_otp(data: ValidateOTPRequest, db: Session = Depends(get_db)):
    """Check if OTP is valid without resetting yet. Used for step 2 UX."""
    token = get_valid_token(data.email, "student", data.otp, db)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "OTP is valid"}


@router.post("/student/reset-password")
def student_reset_password(
    data    : ResetPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    # Validate password strength first
    is_valid, error_msg = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Validate OTP
    token = get_valid_token(data.email, "student", data.otp, db)
    if not token:
        log_action(data.email, "student", "failed", ip, db, "Invalid or expired OTP")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Find student
    student = db.query(models.Student).filter(models.Student.email == data.email).first()
    if not student:
        raise HTTPException(status_code=400, detail="Invalid request")

    # Update password
    student.password_hash = pwd_ctx.hash(data.new_password)

    # Mark token as used
    token.used = True
    db.commit()

    # Audit log
    log_action(data.email, "student", "password_changed", ip, db)

    # Send confirmation email
    try:
        send_password_changed_email(data.email, "student")
    except Exception as e:
        print(f"[Email] {e}")

    return {"message": "Password reset successfully. Please log in with your new password."}


# ─── Company Forgot Password ──────────────────────────────────────────────────

@router.post("/company/forgot-password")
def company_forgot_password(
    data    : ForgotPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    allowed, msg = check_rate_limit(data.email, ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    record_rate_limit(data.email, ip)

    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()

    log_action(data.email, "company", "requested", ip, db)

    if company:
        otp = generate_otp()
        create_reset_token(data.email, "company", otp, db)
        try:
            send_password_reset_email(data.email, otp, "company")
        except Exception as e:
            print(f"[Email] Failed to send reset email: {e}")

    return SAFE_RESPONSE


@router.post("/company/validate-otp")
def company_validate_otp(data: ValidateOTPRequest, db: Session = Depends(get_db)):
    token = get_valid_token(data.email, "company", data.otp, db)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    return {"message": "OTP is valid"}


@router.post("/company/reset-password")
def company_reset_password(
    data    : ResetPasswordRequest,
    request : Request,
    db      : Session = Depends(get_db)
):
    ip = get_client_ip(request)

    is_valid, error_msg = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    token = get_valid_token(data.email, "company", data.otp, db)
    if not token:
        log_action(data.email, "company", "failed", ip, db, "Invalid or expired OTP")
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    company = db.query(cm.Company).filter(cm.Company.email == data.email).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid request")

    company.password_hash = pwd_ctx.hash(data.new_password)
    token.used = True
    db.commit()

    log_action(data.email, "company", "password_changed", ip, db)

    try:
        send_password_changed_email(data.email, "company")
    except Exception as e:
        print(f"[Email] {e}")

    return {"message": "Password reset successfully. Please log in with your new password."}


# ─── Admin: View Reset Logs ───────────────────────────────────────────────────

@router.get("/admin/reset-logs", tags=["Admin"])
def get_reset_logs(
    db : Session = Depends(get_db),
    # _  = Depends(require_admin)   # uncomment if you want auth guard
):
    """Admin: view all password reset audit logs."""
    logs = db.query(prm.PasswordResetLog).order_by(
        prm.PasswordResetLog.created_at.desc()
    ).limit(200).all()
    return [
        {
            "id"         : l.id,
            "email"      : l.email,
            "user_type"  : l.user_type,
            "action"     : l.action,
            "ip_address" : l.ip_address,
            "details"    : l.details,
            "created_at" : l.created_at,
        }
        for l in logs
    ]