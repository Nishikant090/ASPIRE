# config.py - Reads all secrets from aspire/.env (one level above this file)

import os
from pathlib import Path
from dotenv import load_dotenv

# Go one folder up from backend/ to find the .env at aspire/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# ── Gmail SMTP ────────────────────────────────────────────────────
GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD", "")

# ── JWT ───────────────────────────────────────────────────────────
JWT_SECRET        = os.getenv("JWT_SECRET", "fallback_secret")
JWT_ALGORITHM     = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# ── Admin Credentials ─────────────────────────────────────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "admin@aspire.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# ── OTP ───────────────────────────────────────────────────────────
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))