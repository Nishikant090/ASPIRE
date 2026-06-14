/**
 * Login.js - Student login/signup page with OTP verification
 * Step 1: Enter email → Step 2: Enter OTP → Auto-redirect to dashboard
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendOTP, verifyOTP, saveAuthToken } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);        // 1 = enter email, 2 = enter OTP
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Step 1: send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendOTP(email, name);
      setMessage(`OTP sent to ${email}. Check your inbox!`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP, save token, go to dashboard
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await verifyOTP(email, otp);
      const { access_token, student_id } = res.data;
      saveAuthToken(access_token, student_id, "student");
      localStorage.setItem("studentEmail", email);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 440 }}>
          <div className="card" style={{ padding: 40 }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚀</div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "1.5rem", fontWeight: 800, color: "var(--gray-900)", marginBottom: 8
              }}>
                {step === 1 ? "Sign in to Aspire" : "Verify your email"}
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
                {step === 1
                  ? "Enter your email to receive a verification code"
                  : `We sent a 6-digit code to ${email}`}
              </p>
            </div>

            {/* Success message */}
            {message && (
              <div style={{
                background: "var(--mint-light)", border: "1px solid #A7F3D0",
                borderRadius: "var(--radius-sm)", padding: "12px 16px",
                color: "var(--mint)", fontSize: "0.875rem", marginBottom: 20
              }}>
                ✅ {message}
              </div>
            )}

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

            {/* Step 1: Email form */}
            {step === 1 && (
              <form onSubmit={handleSendOTP}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text" className="form-input" placeholder="Arjun Sharma"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email" className="form-input" placeholder="you@college.edu"
                    value={email} required onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send Verification Code →"}
                </button>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <Link
                    to="/forgot-password/student"
                    style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>
            )}

            {/* Step 2: OTP form */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div className="form-group">
                  <label className="form-label">6-Digit OTP *</label>
                  <input
                    type="text" className="form-input"
                    placeholder="_ _ _ _ _ _"
                    maxLength={6}
                    value={otp} required
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px", fontWeight: 700 }}
                  />
                  <p style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 6 }}>
                    ⏳ Expires in 5 minutes
                  </p>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Continue →"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-full"
                  style={{ marginTop: 10 }}
                  onClick={() => { setStep(1); setOtp(""); setError(""); setMessage(""); }}
                >
                  ← Change Email
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}