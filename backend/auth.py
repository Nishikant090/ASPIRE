# auth.py - JWT token creation, refresh token persistence, OTP handling, and auth guards
# Supports access tokens + refresh tokens with secure HttpOnly cookies, DB-backed OTP verification

import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import or_

from config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    COOKIE_NAME,
    COOKIE_SECURE,
    COOKIE_SAMESITE,
    OTP_EXPIRE_MINUTES,
    OTP_MAX_ATTEMPTS,
    OTP_MAX_RESENDS,
    OTP_RESEND_COOLDOWN_SECONDS,
)
import auth_models as am
from database import get_db

# This extracts the Bearer token from the Authorization header
bearer_scheme = HTTPBearer()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_token(value: str) -> str:
    """Hash a token using SHA256."""
    return hashlib.sha256(value.encode()).hexdigest()


# ─── Access Token ─────────────────────────────────────────────────────────────

def create_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    """Create an access token with optional custom expiry."""
    payload = data.copy()
    expires_delta = timedelta(minutes=expires_minutes or ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(data: dict) -> str:
    """Create an access token with standard expiry (24 hours)."""
    return create_token(data, expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns the payload dict."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[dict]:
    """Return JWT payload if a valid Bearer token is present, else None."""
    if not credentials:
        return None
    try:
        return decode_token(credentials.credentials)
    except HTTPException:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency: extract and validate JWT from Authorization header."""
    return decode_token(credentials.credentials)


def require_admin(user: dict = Depends(get_current_user)):
    """FastAPI dependency: ensure user is admin."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_role(role: str):
    """Build a dependency that requires a specific token role."""
    def _require_role(user: dict = Depends(get_current_user)):
        if user.get("role") != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{role.title()} access required",
            )
        return user

    return _require_role


require_student = require_role("student")


def get_student_id_from_user(user: dict, db: Session) -> int:
    """Resolve student ID from JWT payload."""
    student_id = user.get("student_id")
    if student_id:
        return int(student_id)

    from models import Student
    student = db.query(Student).filter(
        or_(
            Student.college_email == user.get("sub"),
            Student.personal_email == user.get("sub"),
        )
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student.id


def get_current_student(user: dict = Depends(require_student), db: Session = Depends(get_db)):
    """FastAPI dependency: authenticated student record."""
    from models import Student
    student_id = get_student_id_from_user(user, db)
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if not student.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account inactive")
    if student.status.value == "blocked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account blocked")
    return student


def issue_auth_tokens(
    response: Response,
    db: Session,
    *,
    role: str,
    user_id: int,
    access_payload: dict,
) -> str:
    """Create access + refresh tokens; set refresh cookie on response."""
    access_token = create_access_token(access_payload)
    refresh_token = create_refresh_token(role, user_id, db)
    set_refresh_cookie(response, refresh_token)
    return access_token


# ─── Refresh Token ────────────────────────────────────────────────────────────

def create_refresh_token(user_type: str, user_id: int, db: Session) -> str:
    """Create a refresh token and persist it in the database."""
    jti = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "role": user_type,
        "jti": jti,
        "exp": expires_at,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Store token hash in DB for revocation checking
    refresh_record = am.RefreshToken(
        user_type=user_type,
        user_id=user_id,
        jti=jti,
        token_hash=_hash_token(token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(refresh_record)
    db.commit()
    db.refresh(refresh_record)
    return token


def verify_refresh_token(refresh_token: str, db: Session) -> am.RefreshToken:
    """Verify a refresh token and return the database record."""
    payload = decode_token(refresh_token)
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    record = db.query(am.RefreshToken).filter(am.RefreshToken.jti == jti).first()
    if not record or record.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    if record.token_hash != _hash_token(refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return record


def revoke_refresh_token(record: am.RefreshToken, db: Session):
    """Mark a refresh token as revoked (used during logout)."""
    record.revoked = True
    db.commit()


def revoke_all_user_sessions(user_type: str, user_id: int, db: Session):
    """Revoke all refresh tokens for a user (e.g. after password change)."""
    records = db.query(am.RefreshToken).filter(
        am.RefreshToken.user_type == user_type,
        am.RefreshToken.user_id == user_id,
        am.RefreshToken.revoked == False,
    ).all()
    for record in records:
        record.revoked = True
    db.commit()


def rotate_refresh_token(
    response: Response,
    db: Session,
    old_record: am.RefreshToken,
    *,
    role: str,
    user_id: int,
    access_payload: dict,
) -> str:
    """Issue new access + refresh tokens and revoke the previous refresh token."""
    revoke_refresh_token(old_record, db)
    access_token = create_access_token(access_payload)
    new_refresh = create_refresh_token(role, user_id, db)
    set_refresh_cookie(response, new_refresh)
    return access_token


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ─── Secure Cookie Management ─────────────────────────────────────────────────

def set_refresh_cookie(response: Response, token: str):
    """Set refresh token as HttpOnly secure cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_refresh_cookie(response: Response):
    """Clear the refresh token cookie (used during logout)."""
    response.delete_cookie(key=COOKIE_NAME, path="/")


# ─── OTP Verification (DB-Backed) ─────────────────────────────────────────────

def create_otp_verification(
    db: Session,
    email: str,
    user_type: str,
    purpose: am.OTPPurpose,
    otp: str,
) -> am.OTPVerification:
    """Create or update an OTP verification record with resend tracking."""
    purpose_value = purpose.value if hasattr(purpose, "value") else purpose
    user_type_value = user_type.value if hasattr(user_type, "value") else user_type

    existing = db.query(am.OTPVerification).filter(
        am.OTPVerification.email == email,
        am.OTPVerification.user_type == user_type_value,
        am.OTPVerification.purpose == purpose_value,
        am.OTPVerification.used == False,
    ).order_by(am.OTPVerification.created_at.desc()).first()

    now = datetime.utcnow()
    if existing and now > existing.expires_at:
        existing.used = True
        db.commit()
        existing = None

    if existing:
        elapsed = (now - existing.created_at).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            remaining = max(1, int(OTP_RESEND_COOLDOWN_SECONDS - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} seconds before requesting another code.",
            )
        if existing.resend_count >= OTP_MAX_RESENDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification requests. Try again later.",
            )
        existing.otp_hash = pwd_ctx.hash(otp)
        existing.expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
        existing.attempts = 0
        existing.resend_count += 1
        existing.created_at = now
        db.commit()
        db.refresh(existing)
        return existing

    record = am.OTPVerification(
        email=email,
        user_type=user_type_value,
        purpose=purpose_value,
        otp_hash=pwd_ctx.hash(otp),
        expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
        used=False,
        attempts=0,
        resend_count=1,
        created_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def verify_otp_record(
    db: Session,
    email: str,
    purpose: am.OTPPurpose,
    otp: str,
) -> Tuple[Optional[am.OTPVerification], Optional[str]]:
    """Verify OTP. Returns (record, error_code) where error_code is expired|locked|invalid."""
    purpose_value = purpose.value if hasattr(purpose, "value") else purpose
    record = db.query(am.OTPVerification).filter(
        am.OTPVerification.email == email,
        am.OTPVerification.purpose == purpose_value,
        am.OTPVerification.used == False,
    ).order_by(am.OTPVerification.created_at.desc()).first()

    if not record:
        return None, "invalid"

    if datetime.utcnow() > record.expires_at:
        record.used = True
        db.commit()
        return None, "expired"

    if not pwd_ctx.verify(otp, record.otp_hash):
        record.attempts += 1
        if record.attempts >= OTP_MAX_ATTEMPTS:
            record.used = True
            db.commit()
            return None, "locked"
        db.commit()
        return None, "invalid"

    record.used = True
    db.commit()
    return record, None
