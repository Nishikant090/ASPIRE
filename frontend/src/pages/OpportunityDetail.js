/**
 * OpportunityDetail.js - Full details page for a single opportunity
 * Shows all info and allows students to apply
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOpportunity, applyToOpportunity, getStudentByEmail, createStudent } from "../api";
import Toast from "../components/Toast";

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(false);

  // Application form state
  const [appForm, setAppForm] = useState({
    name: "", email: "", college: "", branch: "", year: "", skills: "", cover_note: "", resume: null, resumeName: ""
  });

  useEffect(() => {
    getOpportunity(id)
      .then((res) => setOpportunity(res.data))
      .catch(() => navigate("/browse"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
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

      // Submit application
      await applyToOpportunity({
        student_id: student.id,
        opportunity_id: opportunity.id,
        cover_note: appForm.cover_note,
      });

      setShowApplyModal(false);
      setToast({ message: "Application submitted successfully! 🎉", type: "success" });

      // Save student ID to localStorage for dashboard access
      localStorage.setItem("studentId", student.id);
      localStorage.setItem("studentEmail", appForm.email);

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
        <p style={{ color: "var(--gray-400)" }}>Loading details...</p>
      </div>
    );
  }

  if (!opportunity) return null;

  const skills = opportunity.skills.split(",").map((s) => s.trim());

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
              padding: "6px 14px",
              cursor: "pointer",
              marginBottom: 20,
              fontSize: "0.85rem",
            }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <div
              style={{
                width: 72, height: 72,
                background: "rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-lg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem",
                flexShrink: 0,
              }}
            >
              {opportunity.logo || "🏢"}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.8rem", fontWeight: 800 }}>
                {opportunity.title}
              </h1>
              <p style={{ color: "var(--gray-300)", fontSize: "1.05rem", marginTop: 4 }}>
                {opportunity.company}
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <span className={`opp-type-badge badge-${opportunity.type}`}>{opportunity.type}</span>
                <span style={{ color: "var(--gray-300)", fontSize: "0.9rem" }}>📍 {opportunity.location}</span>
                <span style={{ color: "var(--gray-300)", fontSize: "0.9rem" }}>💰 {opportunity.stipend}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
            {/* Main Content */}
            <div>
              {/* Description */}
              <div className="card" style={{ padding: 28, marginBottom: 20 }}>
                <h2
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1.1rem", fontWeight: 700,
                    marginBottom: 14, color: "var(--gray-900)"
                  }}
                >
                  About this Role
                </h2>
                <p style={{ color: "var(--gray-600)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                  {opportunity.description}
                </p>
              </div>

              {/* Skills */}
              <div className="card" style={{ padding: 28 }}>
                <h2
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1.1rem", fontWeight: 700,
                    marginBottom: 16, color: "var(--gray-900)"
                  }}
                >
                  Skills Required
                </h2>
                <div className="opp-skills">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="skill-tag"
                      style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Apply card */}
              <div
                className="card"
                style={{
                  padding: 28,
                  marginBottom: 16,
                  border: "2px solid var(--indigo)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1rem", fontWeight: 700,
                    marginBottom: 20, color: "var(--gray-900)"
                  }}
                >
                  Ready to Apply?
                </h3>
                <button
                  className="btn btn-primary btn-full btn-lg"
                  onClick={() => setShowApplyModal(true)}
                >
                  Apply Now →
                </button>
                <p style={{ color: "var(--gray-400)", fontSize: "0.78rem", textAlign: "center", marginTop: 12 }}>
                  Takes less than 2 minutes
                </p>
              </div>

              {/* Details card */}
              <div className="card" style={{ padding: 24 }}>
                <h3
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "0.9rem", fontWeight: 700,
                    marginBottom: 16, color: "var(--gray-700)",
                    textTransform: "uppercase", letterSpacing: "0.5px"
                  }}
                >
                  Details
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Type", value: opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1) },
                    { label: "Location", value: opportunity.location },
                    { label: "Stipend/Salary", value: opportunity.stipend },
                    { label: "Company", value: opportunity.company },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 600, marginBottom: 2 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "var(--gray-700)", fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Apply for {opportunity.title}</h2>
              <button className="modal-close" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>

            <form onSubmit={handleApply}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text" className="form-input" placeholder="Arjun Sharma"
                    value={appForm.name} required
                    onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email" className="form-input" placeholder="you@college.edu"
                    value={appForm.email} required
                    onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">College *</label>
                <input
                  type="text" className="form-input" placeholder="IIT Delhi"
                  value={appForm.college} required
                  onChange={(e) => setAppForm({ ...appForm, college: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Branch *</label>
                  <input
                    type="text" className="form-input" placeholder="Computer Science"
                    value={appForm.branch} required
                    onChange={(e) => setAppForm({ ...appForm, branch: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Year *</label>
                  <select
                    className="form-select"
                    value={appForm.year} required
                    onChange={(e) => setAppForm({ ...appForm, year: e.target.value })}
                  >
                    <option value="">Select Year</option>
                    {["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Your Skills</label>
                <input
                  type="text" className="form-input" placeholder="Python, React.js, SQL"
                  value={appForm.skills}
                  onChange={(e) => setAppForm({ ...appForm, skills: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cover Note (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tell them why you're excited about this role..."
                  value={appForm.cover_note}
                  onChange={(e) => setAppForm({ ...appForm, cover_note: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Resume (PDF) - Recommended</label>
                <div
                  style={{
                    border: "2px dashed var(--indigo-light)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => document.getElementById("resume-input-opp").click()}
                >
                  {appForm.resumeName ? (
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gray-800)" }}>
                      📄 {appForm.resumeName}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>
                      📤 Click to upload PDF resume
                    </div>
                  )}
                </div>
                <input
                  id="resume-input-opp"
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.name.endsWith(".pdf")) {
                      setAppForm({ ...appForm, resume: file, resumeName: file.name });
                    }
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={applying}>
                  {applying ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
