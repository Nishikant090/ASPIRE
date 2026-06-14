# email_service.py - All email sending logic using Gmail SMTP
# Handles: OTP verification, application received, selected, rejected

import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import GMAIL_USER, GMAIL_PASSWORD


def generate_otp():
    """Generate a random 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


def send_email(to_email: str, subject: str, html_body: str):
    """
    Core function to send an email using Gmail SMTP.
    Called by all other send_* functions below.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email Error] Failed to send to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, otp: str, name: str = "Student"):
    """Send OTP verification email."""
    subject = "🔐 Your Aspire Verification Code"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
      <h2 style="color: #0F1B2D; margin-bottom: 8px;">Verify your email</h2>
      <p style="color: #64748b;">Hi {name}, use the code below to verify your Aspire account.</p>
      <div style="background: #4F46E5; color: white; font-size: 2.5rem; font-weight: bold;
                  text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 12px; margin: 24px 0;">
        {otp}
      </div>
      <p style="color: #64748b; font-size: 0.85rem;">⏳ This code expires in <strong>5 minutes</strong>.</p>
      <p style="color: #64748b; font-size: 0.85rem;">If you didn't request this, ignore this email.</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_application_received_email(to_email: str, student_name: str, job_title: str, company: str):
    """Send confirmation email when a student applies."""
    subject = f"✅ Application Received — {job_title} at {company}"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0F1B2D;">Application Received! 🎉</h2>
      <p>Hi <strong>{student_name}</strong>,</p>
      <p>Your application for <strong>{job_title}</strong> at <strong>{company}</strong> has been received.</p>
      <p style="background: #EEF2FF; padding: 16px; border-radius: 8px; color: #4F46E5;">
        We'll notify you as your application status changes. Good luck!
      </p>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 24px;">— Team Aspire</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_status_update_email(to_email: str, student_name: str, job_title: str, company: str, status: str):
    """Send email when admin updates application to Selected or Rejected."""
    if status == "Selected":
        subject = f"🎉 Congratulations! You're selected — {job_title}"
        color = "#10B981"
        message = f"Congratulations <strong>{student_name}</strong>! You have been <strong>selected</strong> for <strong>{job_title}</strong> at <strong>{company}</strong>. The team will reach out to you soon with next steps."
    elif status == "Rejected":
        subject = f"Update on your application — {job_title}"
        color = "#F43F5E"
        message = f"Hi <strong>{student_name}</strong>, thank you for your interest in <strong>{job_title}</strong> at <strong>{company}</strong>. Unfortunately, your application was not selected this time. Keep applying — your next opportunity is around the corner!"
    else:
        return  # Only send emails for Selected and Rejected

    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0F1B2D;">Application Update</h2>
      <p style="background: {color}20; border-left: 4px solid {color}; padding: 16px; border-radius: 0 8px 8px 0; color: #1e293b;">
        {message}
      </p>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 24px;">— Team Aspire</p>
    </div>
    """
    return send_email(to_email, subject, body)