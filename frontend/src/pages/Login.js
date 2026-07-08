/**
 * Login.js - Student login with college email + password
 */

import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { studentLogin } from "../api";
import { getApiErrorMessage, parseApiDetail } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [collegeEmail, setCollegeEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyLink, setVerifyLink] = useState("");
  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setVerifyLink("");
    try {
      const res = await studentLogin(collegeEmail, password);
      const { access_token, student_id, email } = res.data;
      login({
        token: access_token,
        role: "student",
        studentId: student_id,
        email: email || collegeEmail,
      });
      const redirectTo = location.state?.from?.pathname || location.state?.from || "/dashboard";
      navigate(typeof redirectTo === "string" ? redirectTo : redirectTo.pathname || "/dashboard", { replace: true });
    } catch (err) {
      const detail = parseApiDetail(err.response?.data?.detail);
      let message = getApiErrorMessage(err, "Invalid college email or password.");

      if (detail.code === "EMAIL_NOT_VERIFIED" && detail.student_id) {
        message = detail.message || "Please complete email verification before logging in.";
        setVerifyLink(`/verify-email/${detail.student_id}`);
      } else {
        setVerifyLink("");
      }

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
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚀</div>
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-subtitle">Log in with your college email and password</p>
            </div>

            {successMessage && <div className="alert alert-success">{successMessage}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            {verifyLink && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <Link to={verifyLink} className="btn btn-secondary btn-full">
                  Continue email verification
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">College Email ID</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@college.edu"
                  value={collegeEmail}
                  required
                  autoComplete="username"
                  onChange={(e) => setCollegeEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  required
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In →"}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: "0.85rem" }}>
                <Link to="/forgot-password/student" style={{ color: "var(--gray-500)" }}>
                  Forgot password?
                </Link>
                <Link to="/register" style={{ color: "var(--indigo)" }}>
                  Create account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
