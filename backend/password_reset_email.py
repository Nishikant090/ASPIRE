"""
password_reset_email.py - Email templates for password reset
"""

from email_service import send_email


def send_password_reset_email(to_email: str, otp: str, user_type: str = "student"):
    """Send the OTP reset email."""
    subject = "🔐 Reset Your Aspire Password"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#0F1B2D;margin-bottom:8px;">Reset Your Password</h2>
      <p style="color:#64748b;margin-bottom:24px;">
        We received a request to reset your Aspire password.
        Use the OTP below to proceed.
      </p>

      <div style="background:#4F46E5;color:white;font-size:2.2rem;font-weight:bold;
                  text-align:center;padding:24px;border-radius:12px;
                  letter-spacing:14px;margin:0 0 24px;">
        {otp}
      </div>

      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;
                  padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;color:#92400E;font-size:0.875rem;">
          ⏳ This OTP expires in <strong>10 minutes</strong>.
        </p>
      </div>

      <p style="color:#64748b;font-size:0.85rem;margin-bottom:8px;">
        If you did not request a password reset, please ignore this email.
        Your password will remain unchanged.
      </p>
      <p style="color:#94a3b8;font-size:0.8rem;">— Team Aspire</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_password_changed_email(to_email: str, user_type: str = "student"):
    """Notify user that their password was successfully changed."""
    subject = "✅ Password Successfully Changed — Aspire"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#0F1B2D;">Password Changed Successfully</h2>
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;
                  padding:16px;margin:20px 0;">
        <p style="margin:0;color:#065F46;">
          ✅ Your Aspire password has been updated successfully.
          You can now log in with your new password.
        </p>
      </div>
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:8px;
                  padding:16px;margin-bottom:20px;">
        <p style="margin:0;color:#9F1239;font-size:0.875rem;">
          ⚠️ If you did not make this change, contact support immediately.
        </p>
      </div>
      <p style="color:#94a3b8;font-size:0.85rem;">— Team Aspire</p>
    </div>
    """
    return send_email(to_email, subject, body)