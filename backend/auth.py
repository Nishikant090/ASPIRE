# auth.py - JWT token creation and verification
# Used to protect routes and identify logged-in users

from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

# This extracts the Bearer token from the Authorization header
bearer_scheme = HTTPBearer()


def create_token(data: dict) -> str:
    """
    Create a JWT token.
    data should contain: {"sub": email, "role": "student" or "admin"}
    """
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns the payload dict."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """
    FastAPI dependency: extracts and validates JWT from request header.
    Use with Depends(get_current_user) on any protected route.
    Returns the token payload (contains email and role).
    """
    return decode_token(credentials.credentials)


def require_admin(user: dict = Depends(get_current_user)):
    """
    FastAPI dependency: ensures the logged-in user is an admin.
    Use with Depends(require_admin) on admin-only routes.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user