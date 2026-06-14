/**
 * ResetPassword.js - Reset password page for both Student and Company
 * 3-step flow: Enter OTP → Verify → Set new password
 */

import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  studentValidateOTP, studentResetPassword,
  companyValidateOTP, companyResetPassword
} from "../api/passwordReset";
import PasswordInput from "../components/PasswordInput";

export default function ResetPassword({ userType = "student" }) {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const isStudent       = userType === "student";
  const loginPath       = isStudent ? "/login" : "/company/login";
  const forgotPath      = isStudent ? "/forgot-password/student" : "/forgot-password/company";

  const [step,        setStep]        = useState(1);   // 1=OTP, 2=new password, 3=done
  const [email,       setEmail]       = useState(params.get("email") || "");
  const [otp,         setOtp]         = useState("");
  const [password,    setPassword]    = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Step 1: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("OTP must be exactly 6 digits"); return; }
    setLoading(true); setError("");
    try {
      if (isStudent) {
        await studentValidateOTP(email, otp);
      } else {
        await companyValidateOTP(email, otp);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP");
    } finally { setLoading(false); }
  };

  // Step 2: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPwd) {
      setError("Passwords do not match"); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters"); return;
    }

    setLoading(true);
    try {
      if (isStudent) {
        await studentResetPassword(email, otp, password);
      } else {
        await companyResetPassword(email, otp, password);
      }
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally { setLoading(false); }
  };

  const cardStyle = { padding: 40 };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 460 }}>
          <div className="card" style={cardStyle}>

            {/* Progress indicator */}
            {step < 3 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                {["Enter OTP", "New Password"].map((label, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: step > i + 1 ? "var(--mint)" : step === i + 1 ? "var(--indigo)" : "var(--gray-200)",
                      color: step >= i + 1 ? "white" : "var(--gray-400)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", fontWeight: 700,
                    }}>
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    <span style={{
                      marginLeft: 8, fontSize: "0.8rem", fontWeight: 600,
                      color: step === i + 1 ? "var(--gray-700)" : "var(--gray-400)"
                    }}>
                      {label}
                    </span>
                    {i < 1 && (
                      <div style={{
                        flex: 1, height: 2, margin: "0 10px",
                        background: step > 1 ? "var(--mint)" : "var(--gray-200)",
                        borderRadius: 99
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>
                {step === 1 ? "🔢" : step === 2 ? "🔒" : "🎉"}
              </div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: "1.4rem", fontWeight: 800, color: "var(--gray-900)"
              }}>
                {step === 1 ? "Enter Your OTP" :
                 step === 2 ? "Set New Password" :
                 "Password Reset!"}
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginTop: 6 }}>
                {step === 1 ? `Enter the 6-digit code sent to ${email}` :
                 step === 2 ? "Choose a strong new password" :
                 "Your password has been updated successfully"}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: "var(--rose-light)", border: "1px solid #FECDD3",
                borderRadius: "var(--radius-sm)", padding: "12px 16px",
                color: "var(--rose)", fontSize: "0.875rem", marginBottom: 20
              }}>
                ❌ {error}
              </div>
            )}

            {/* ── Step 1: OTP ── */}
            {step === 1 && (
              <form onSubmit={handleVerifyOTP}>
                {/* Email (editable if not pre-filled) */}
                {!params.get("email") && (
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email" className="form-input"
                      placeholder="your@email.com"
                      value={email} required
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">6-Digit OTP *</label>
                  <input
                    type="text" className="form-input"
                    placeholder="_ _ _ _ _ _"
                    maxLength={6} required
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{
                      textAlign: "center", fontSize: "1.8rem",
                      letterSpacing: "10px", fontWeight: 700
                    }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: 6 }}>
                    ⏳ OTP expires in 10 minutes
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify OTP →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Link to={forgotPath} style={{ color: "var(--indigo)", fontSize: "0.875rem" }}>
                    Didn't receive OTP? Resend
                  </Link>
                </div>
              </form>
            )}

            {/* ── Step 2: New Password ── */}
            {step === 2 && (
              <form onSubmit={handleResetPassword}>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  label="New Password *"
                  placeholder="Min 8 chars, mixed case + number + symbol"
                />

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password" className="form-input"
                      placeholder="Re-enter your new password"
                      value={confirmPwd} required
                      onChange={e => setConfirmPwd(e.target.value)}
                    />
                    {confirmPwd && (
                      <span style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", fontSize: "1rem"
                      }}>
                        {password === confirmPwd ? "✅" : "❌"}
                      </span>
                    )}
                  </div>
                  {confirmPwd && password !== confirmPwd && (
                    <p style={{ color: "var(--rose)", fontSize: "0.78rem", marginTop: 4 }}>
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading || password !== confirmPwd || password.length < 8}
                >
                  {loading ? "Resetting..." : "Reset Password →"}
                </button>
              </form>
            )}

            {/* ── Step 3: Success ── */}
            {step === 3 && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  background: "var(--mint-light)", border: "1px solid #A7F3D0",
                  borderRadius: "var(--radius)", padding: "24px", marginBottom: 24
                }}>
                  <p style={{ color: "#065F46", fontWeight: 600, fontSize: "1rem", marginBottom: 8 }}>
                    ✅ Password Updated!
                  </p>
                  <p style={{ color: "#047857", fontSize: "0.875rem" }}>
                    A confirmation email has been sent to <strong>{email}</strong>.
                    You can now log in with your new password.
                  </p>
                </div>
                <Link to={loginPath} className="btn btn-primary btn-full btn-lg">
                  Go to Login →
                </Link>
              </div>
            )}

            {/* Back to login */}
            {step < 3 && (
              <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--gray-500)" }}>
                <Link to={loginPath} style={{ color: "var(--gray-400)" }}>
                  ← Back to Login
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}