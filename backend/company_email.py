"""
company_email.py - Email templates for company application status updates
"""

from email_service import send_email


def send_company_status_email(
    to_email    : str,
    student_name: str,
    job_title   : str,
    company_name: str,
    status      : str
):
    """Send email to student when company updates their application status."""

    templates = {
        "Under Review": {
            "subject": f"📋 Application Update — {job_title} at {company_name}",
            "color"  : "#F59E0B",
            "message": f"Hi <strong>{student_name}</strong>, your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> is currently <strong>under review</strong>. We'll keep you posted!"
        },
        "Shortlisted": {
            "subject": f"⭐ You've been Shortlisted — {job_title} at {company_name}",
            "color"  : "#4F46E5",
            "message": f"Great news, <strong>{student_name}</strong>! You have been <strong>shortlisted</strong> for <strong>{job_title}</strong> at <strong>{company_name}</strong>. Stay tuned for next steps."
        },
        "Interview Scheduled": {
            "subject": f"📅 Interview Scheduled — {job_title} at {company_name}",
            "color"  : "#7C3AED",
            "message": f"Hi <strong>{student_name}</strong>, your interview for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been <strong>scheduled</strong>. The team will reach out with details soon."
        },
        "Selected": {
            "subject": f"🎉 Congratulations! You're Selected — {job_title}",
            "color"  : "#10B981",
            "message": f"Congratulations <strong>{student_name}</strong>! You have been <strong>selected</strong> for <strong>{job_title}</strong> at <strong>{company_name}</strong>. Welcome aboard — the team will contact you shortly!"
        },
        "Rejected": {
            "subject": f"Application Update — {job_title} at {company_name}",
            "color"  : "#F43F5E",
            "message": f"Hi <strong>{student_name}</strong>, thank you for applying to <strong>{job_title}</strong> at <strong>{company_name}</strong>. After careful review, we regret to inform you that your application was not selected this time. We encourage you to keep applying!"
        },
    }

    t = templates.get(status)
    if not t:
        return  # No email for "Applied" status

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#0F1B2D;margin-bottom:16px;">Application Status Update</h2>
      <div style="border-left:4px solid {t['color']};background:{t['color']}15;
                  padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#1e293b;line-height:1.7;">{t['message']}</p>
      </div>
      <p style="color:#94a3b8;font-size:0.85rem;">Best of luck in your career journey!</p>
      <p style="color:#94a3b8;font-size:0.85rem;margin-top:8px;">— Team Aspire &amp; {company_name}</p>
    </div>
    """
    send_email(to_email, t["subject"], body)


def send_company_approval_email(to_email: str, company_name: str, approved: bool):
    """Notify company when admin approves or rejects their registration."""
    if approved:
        subject = "✅ Your Company Account is Approved — Aspire"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#0F1B2D;">Welcome to Aspire! 🎉</h2>
          <p>Hi <strong>{company_name}</strong>,</p>
          <p>Your company account has been <strong style="color:#10B981;">approved</strong>!
             You can now log in and start posting jobs.</p>
          <p style="color:#94a3b8;font-size:0.85rem;margin-top:24px;">— Team Aspire</p>
        </div>
        """
    else:
        subject = "❌ Company Registration Update — Aspire"
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#0F1B2D;">Registration Update</h2>
          <p>Hi <strong>{company_name}</strong>,</p>
          <p>Unfortunately your company registration was <strong style="color:#F43F5E;">not approved</strong>
             at this time. Please contact support for more information.</p>
          <p style="color:#94a3b8;font-size:0.85rem;margin-top:24px;">— Team Aspire</p>
        </div>
        """
    send_email(to_email, subject, body)