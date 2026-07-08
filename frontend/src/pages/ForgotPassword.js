/**
 * ForgotPassword.js - Secure forgot password (account must exist)
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { studentForgotPassword, companyForgotPassword } from "../api/passwordReset";
import { getApiErrorMessage } from "../api/errors";
import { useToast } from "../context/ToastContext";

export default function ForgotPassword({ userType = "student" }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isStudent = userType === "student";
  const loginPath = isStudent ? "/login" : "/company/login";
  const resetPath = isStudent ? "/reset-password/student" : "/reset-password/company";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isStudent) {
        await studentForgotPassword(email);
      } else {
        await companyForgotPassword(email);
      }
      setSent(true);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Account not found. Please check your email or register first."
      );
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 440 }}>
          <div className="card" style={{ padding: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64,
                background: "linear-gradient(135deg,var(--indigo),#7C3AED)",
                borderRadius: "50%", margin: "0 auto 16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem"
              }}>
                🔐
              </div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "var(--gray-900)" }}>
                Forgot Password?
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", marginTop: 8 }}>
                {isStudent ? "Enter your registered college email" : "Enter your company email"}
              </p>
            </div>

            {sent ? (
              <div>
                <div style={{
                  background: "var(--mint-light)", border: "1px solid #A7F3D0",
                  borderRadius: "var(--radius)", padding: "20px",
                  textAlign: "center", marginBottom: 24
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📧</div>
                  <p style={{ color: "#065F46", fontWeight: 600, marginBottom: 4 }}>Check your inbox!</p>
                  <p style={{ color: "#047857", fontSize: "0.875rem" }}>
                    A 6-digit OTP has been sent to your registered {isStudent ? "college" : ""} email.
                  </p>
                </div>
                <Link to={`${resetPath}?email=${encodeURIComponent(email)}`} className="btn btn-primary btn-full">
                  Enter OTP & Reset Password →
                </Link>
                <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={() => { setSent(false); setEmail(""); }}>
                  Try different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">{isStudent ? "College Email ID" : "Email Address"} *</label>
                  <input
                    type="email" className="form-input"
                    placeholder={isStudent ? "you@college.edu" : "hr@company.com"}
                    value={email} required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send Reset OTP →"}
                </button>
              </form>
            )}

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--gray-500)" }}>
              Remember your password?{" "}
              <Link to={loginPath} style={{ color: "var(--indigo)", fontWeight: 600 }}>Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
