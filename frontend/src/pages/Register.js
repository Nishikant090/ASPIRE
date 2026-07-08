/**
 * Register.js - Student registration (college email only)
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerStudent } from "../api";
import { getApiErrorMessage, parseApiDetail } from "../api/errors";
import { useToast } from "../context/ToastContext";

const INITIAL = {
  full_name: "",
  college_name: "",
  college_email: "",
  password: "",
  confirm_password: "",
  tnp_head_name: "",
  tnp_head_phone: "",
  branch: "",
  cgpa: "",
  graduation_year: "",
  linkedin_url: "",
  github_url: "",
  skills: "",
  resume_path: "",
};

export default function Register() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirm_password) {
      const message = "Passwords do not match.";
      setError(message);
      showToast(message, "error");
      setLoading(false);
      return;
    }

    try {
      const res = await registerStudent(form);
      navigate(`/verify-email/${res.data.student_id}`, {
        replace: true,
        state: {
          collegeEmail: res.data.college_email,
          message: res.data.message,
        },
      });
    } catch (err) {
      const detail = parseApiDetail(err.response?.data?.detail);
      if (detail.code === "VERIFICATION_PENDING" && detail.student_id) {
        showToast(detail.message || "Finish email verification to activate your account.", "error");
        navigate(`/verify-email/${detail.student_id}`, {
          replace: true,
          state: { collegeEmail: form.college_email },
        });
        return;
      }

      const message = getApiErrorMessage(err, "Registration failed. Please try again.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="card" style={{ padding: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎓</div>
              <h1 className="auth-title">Create your Aspire account</h1>
              <p className="auth-subtitle">Register with your college email — verify once, then log in anytime.</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" required value={form.full_name} onChange={update("full_name")} />
                </div>
                <div className="form-group">
                  <label className="form-label">College Name *</label>
                  <input className="form-input" required value={form.college_name} onChange={update("college_name")} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">College Email ID *</label>
                <input type="email" className="form-input" required placeholder="you@college.edu" value={form.college_email} onChange={update("college_email")} />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" required minLength={8} value={form.password} onChange={update("password")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input type="password" className="form-input" required value={form.confirm_password} onChange={update("confirm_password")} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">TNP Head Name *</label>
                  <input className="form-input" required value={form.tnp_head_name} onChange={update("tnp_head_name")} />
                </div>
                <div className="form-group">
                  <label className="form-label">TNP Head Contact Number *</label>
                  <input className="form-input" required value={form.tnp_head_phone} onChange={update("tnp_head_phone")} />
                </div>
              </div>

              <button type="button" className="btn btn-ghost btn-full" style={{ marginBottom: 16 }} onClick={() => setShowOptional(!showOptional)}>
                {showOptional ? "Hide optional fields" : "Add optional profile details"}
              </button>

              {showOptional && (
                <>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Branch</label>
                      <input className="form-input" value={form.branch} onChange={update("branch")} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CGPA</label>
                      <input className="form-input" value={form.cgpa} onChange={update("cgpa")} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Graduation Year</label>
                    <input className="form-input" value={form.graduation_year} onChange={update("graduation_year")} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Skills</label>
                    <input className="form-input" placeholder="React, Python, SQL..." value={form.skills} onChange={update("skills")} />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">LinkedIn Profile</label>
                      <input className="form-input" value={form.linkedin_url} onChange={update("linkedin_url")} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GitHub Profile</label>
                      <input className="form-input" value={form.github_url} onChange={update("github_url")} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Resume URL</label>
                    <input className="form-input" placeholder="Link to your resume" value={form.resume_path} onChange={update("resume_path")} />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Creating account..." : "Create Account →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 20, color: "var(--gray-500)", fontSize: "0.9rem" }}>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
