# config.py - Reads all secrets from aspire/.env (one level above this file)

import os
from pathlib import Path
from dotenv import load_dotenv

# Go one folder up from backend/ to find the .env at aspire/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# ── Database ───────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aspire.db")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# ── Gmail SMTP ────────────────────────────────────────────────────
GMAIL_USER     = os.getenv("GMAIL_USER", "").strip().strip("'\"")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD", "").strip().strip("'\"")

# ── JWT ───────────────────────────────────────────────────────────
JWT_SECRET                  = os.getenv("JWT_SECRET", "fallback_secret").strip().strip("'\"")
JWT_ALGORITHM               = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# ── Admin Credentials ─────────────────────────────────────────────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@aspire.com").strip().strip("'\"")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123").strip().strip("'\"")

# ── OTP ───────────────────────────────────────────────────────────
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
OTP_MAX_ATTEMPTS   = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_MAX_RESENDS    = int(os.getenv("OTP_MAX_RESENDS", "3"))
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))

# ── Registration / Login Security ───────────────────────────────────────────
PENDING_VERIFICATION_EXPIRE_HOURS = int(os.getenv("PENDING_VERIFICATION_EXPIRE_HOURS", "48"))
LOGIN_MAX_FAILED_ATTEMPTS = int(os.getenv("LOGIN_MAX_FAILED_ATTEMPTS", "5"))
LOGIN_LOCKOUT_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))

# ── Cookies ────────────────────────────────────────────────────────
COOKIE_SECURE   = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_NAME     = os.getenv("COOKIE_NAME", "aspire_refresh_token")