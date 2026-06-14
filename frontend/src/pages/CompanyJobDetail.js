/**
 * CompanyJobDetail.js - Full details page for a company job posting
 * Shows all info and allows students to apply with resume upload
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCompanyJobDetail, applyToCompanyJob, uploadResume } from "../api/company";
import { getStudentByEmail, createStudent, getToken } from "../api";
import Toast from "../components/Toast";

export default function CompanyJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(false);

  // Application form state
  const [appForm, setAppForm] = useState({
    name: "",
    email: "",
    college: "",
    branch: "",
    year: "",
    skills: "",
    cover_note: "",
    resume: null,
    resumeName: "",
  });

  useEffect(() => {
    getCompanyJobDetail(id)
      .then((res) => setJob(res.data))
      .catch(() => navigate("/browse"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith(".pdf")) {
        setToast({ message: "Only PDF resumes allowed", type: "error" });
        return;
      }
      setAppForm((prev) => ({
        ...prev,
        resume: file,
        resumeName: file.name,
      }));
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      // Validate resume is provided
      if (!appForm.resume) {
        setToast({ message: "Please upload your resume (PDF)", type: "error" });
        setApplying(false);
        return;
      }

      // Try to find existing student or create new one
      let student;
      try {
        const res = await getStudentByEmail(appForm.email);
        student = res.data;
      } catch {
        // Student doesn't exist, create one
        const res = await createStudent({
          name: appForm.name,
          email: appForm.email,
          college: appForm.college,
          branch: appForm.branch,
          year: appForm.year,
          skills: appForm.skills,
        });
        student = res.data;
      }

      // Apply to job
      await applyToCompanyJob(job.id, student.id, appForm.cover_note);

      // Upload resume
      await uploadResume(job.id, student.id, appForm.resume);

      setShowApplyModal(false);
      setToast({
        message: "Application submitted successfully! 🎉 Check your email for confirmation.",
        type: "success",
      });

      // Save student ID to localStorage for dashboard access
      localStorage.setItem("studentId", student.id);
      localStorage.setItem("studentEmail", appForm.email);

      // Auto-close modal after 2 seconds
      setTimeout(() => navigate("/browse"), 2000);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to apply. Try again.";
      setToast({ message: msg, type: "error" });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: 120 }}>
        <div className="spinner" />
        <p style={{ color: "var(--gray-400)" }}>Loading job details...</p>
      </div>
    );
  }

  if (!job) return null;

  const skills = (job.skills || "").split(",").map((s) => s.trim());

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="container">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "var(--radius-sm)",
              color: "white",
              padding: "8px 16px",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: 16,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "rgba(255,255,255,0.2)")}
            onMouseLeave={(e) => (e.target.style.background = "rgba(255,255,255,0.1)")}
          >
            ← Back
          </button>
          <h1>{job.title}</h1>
          <p>{job.company?.name || "Company"} · {job.location}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 32, alignItems: "start" }}>
            {/* Left: Job details */}
            <div>
              {/* Meta info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 16,
                  marginBottom: 32,
                  padding: "20px",
                  background: "white",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 4 }}>
                    Type
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                    {job.employment_type?.replace("_", " ") || "Job"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 4 }}>
                    Salary/Stipend
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                    {job.salary}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 4 }}>
                    Location
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                    {job.location}
                  </div>
                </div>
                {job.deadline && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 4 }}>
                      Deadline
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                      {job.deadline}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-900)" }}>
                  About the Role
                </h2>
                <p style={{ lineHeight: 1.7, color: "var(--gray-700)", whiteSpace: "pre-wrap" }}>
                  {job.description}
                </p>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-900)" }}>
                  Required Skills
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {skills.map((skill, i) => (
                    <span key={i} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Eligibility */}
              {job.eligibility && (
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-900)" }}>
                    Eligibility
                  </h2>
                  <p style={{ lineHeight: 1.7, color: "var(--gray-700)" }}>
                    {job.eligibility}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Application card */}
            <div>
              <div
                style={{
                  background: "white",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--gray-200)",
                  padding: 24,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 20, color: "var(--gray-900)" }}>
                  Ready to Apply?
                </h3>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="btn btn-primary btn-full btn-lg"
                >
                  Apply Now
                </button>
                <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 12, textAlign: "center" }}>
                  📝 You'll need to upload your resume
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowApplyModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ padding: 40, maxWidth: 500, width: "90%" }}
          >
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 24, color: "var(--gray-900)" }}>
              Apply to {job.title}
            </h2>

            <form onSubmit={handleApply}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={appForm.name}
                  onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                  required
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="john@college.edu"
                  value={appForm.email}
                  onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
                  required
                />
              </div>

              {/* College */}
              <div className="form-group">
                <label className="form-label">College/University</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="IIT Delhi"
                  value={appForm.college}
                  onChange={(e) => setAppForm({ ...appForm, college: e.target.value })}
                />
              </div>

              {/* Branch */}
              <div className="form-group">
                <label className="form-label">Branch</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Computer Science"
                  value={appForm.branch}
                  onChange={(e) => setAppForm({ ...appForm, branch: e.target.value })}
                />
              </div>

              {/* Year */}
              <div className="form-group">
                <label className="form-label">Year</label>
                <select
                  className="form-input"
                  value={appForm.year}
                  onChange={(e) => setAppForm({ ...appForm, year: e.target.value })}
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Final Year">Final Year</option>
                </select>
              </div>

              {/* Skills */}
              <div className="form-group">
                <label className="form-label">Your Skills</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Python, React, SQL (comma-separated)"
                  value={appForm.skills}
                  onChange={(e) => setAppForm({ ...appForm, skills: e.target.value })}
                />
              </div>

              {/* Resume Upload - CRITICAL */}
              <div className="form-group">
                <label className="form-label">Resume (PDF) *</label>
                <div
                  style={{
                    border: "2px dashed var(--indigo-light)",
                    borderRadius: "var(--radius-sm)",
                    padding: "24px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: appForm.resume ? "var(--indigo-ultra-light)" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--indigo)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--indigo-light)")
                  }
                  onClick={() => document.getElementById("resume-input").click()}
                >
                  {appForm.resumeName ? (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📄</div>
                      <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>
                        {appForm.resumeName}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 4 }}>
                        Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📤</div>
                      <div style={{ fontWeight: 600, color: "var(--indigo)" }}>
                        Upload your resume
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 4 }}>
                        PDF only, max 5MB
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={handleResumeChange}
                />
              </div>

              {/* Cover Note */}
              <div className="form-group">
                <label className="form-label">Cover Letter (Optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Tell us why you're interested in this role..."
                  value={appForm.cover_note}
                  onChange={(e) => setAppForm({ ...appForm, cover_note: e.target.value })}
                  style={{ minHeight: 100, resize: "vertical" }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={applying}
                style={{ marginTop: 20 }}
              >
                {applying ? "Submitting..." : "Submit Application"}
              </button>

              {/* Close */}
              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={() => setShowApplyModal(false)}
                style={{ marginTop: 8 }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
