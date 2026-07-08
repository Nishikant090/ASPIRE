/**
 * OpportunityDetail.js - Admin-curated opportunity details with authenticated apply
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOpportunity, getOpportunityApplicationStatus, applyToOpportunity, saveJob } from "../api";
import BackButton from "../components/BackButton";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isStudent, studentId } = useAuth();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState({ applied: false });
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const oppRes = await getOpportunity(id);
        setOpportunity(oppRes.data);

        if (isAuthenticated && isStudent) {
          const statusRes = await getOpportunityApplicationStatus(id);
          setApplicationStatus(statusRes.data);
        }
      } catch {
        navigate("/browse");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, isAuthenticated, isStudent]);

  const handleApplyClick = () => {
    if (!isAuthenticated || !isStudent) {
      navigate("/login", { state: { from: `/opportunity/${id}` } });
      return;
    }
    setShowApplyModal(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!opportunity) return;
    setApplying(true);
    try {
      await applyToOpportunity({
        student_id: studentId,
        opportunity_id: opportunity.id,
        cover_note: coverNote,
      });
      setShowApplyModal(false);
      setApplicationStatus({ applied: true, status: "Applied" });
      setToast({ message: "Application submitted successfully!", type: "success" });
    } catch (err) {
      setToast({
        message: err.response?.data?.detail || "Failed to apply. Try again.",
        type: "error",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !isStudent) {
      navigate("/login", { state: { from: `/opportunity/${id}` } });
      return;
    }
    try {
      await saveJob("opportunity", parseInt(id, 10));
      setSaved(true);
      setToast({ message: "Job saved!", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Could not save job", type: "error" });
    }
  };

  const skills = opportunity?.skills
    ? opportunity.skills.split(",").map((s) => s.trim())
    : [];
  const hasApplied = applicationStatus.applied;

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: 120 }}>
        <div className="spinner" />
        <p style={{ color: "var(--gray-400)" }}>Loading details...</p>
      </div>
    );
  }

  if (!opportunity) return null;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <BackButton style={{ color: "white", borderColor: "rgba(255,255,255,0.2)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                background: "rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
            <div>
              <div className="card" style={{ padding: 28, marginBottom: 20 }}>
                <h2
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: 14,
                    color: "var(--gray-900)",
                  }}
                >
                  Job Description
                </h2>
                <p style={{ color: "var(--gray-600)", lineHeight: 1.8, fontSize: "0.95rem" }}>
                  {opportunity.description}
                </p>
              </div>

              <div className="card" style={{ padding: 28 }}>
                <h2
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "var(--gray-900)",
                  }}
                >
                  Required Skills
                </h2>
                <div className="opp-skills">
                  {skills.map((skill, i) => (
                    <span key={i} className="skill-tag" style={{ padding: "6px 14px", fontSize: "0.85rem" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div
                className="card"
                style={{
                  padding: 28,
                  marginBottom: 16,
                  border: hasApplied ? "2px solid var(--mint)" : "2px solid var(--indigo)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1rem",
                    fontWeight: 700,
                    marginBottom: 20,
                    color: "var(--gray-900)",
                  }}
                >
                  {hasApplied ? "Application Status" : "Ready to Apply?"}
                </h3>

                {hasApplied ? (
                  <>
                    <div
                      className="opp-type-badge badge-selected"
                      style={{ display: "block", textAlign: "center", padding: "14px", fontSize: "1rem", marginBottom: 12 }}
                    >
                      ✓ Applied
                    </div>
                    <button className="btn btn-primary btn-full" onClick={() => navigate("/dashboard")}>
                      View in Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary btn-full btn-lg" onClick={handleApplyClick}>
                      Apply Now →
                    </button>
                    <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={handleSave} disabled={saved}>
                      {saved ? "✓ Saved" : "🔖 Save Job"}
                    </button>
                    {!isAuthenticated && (
                      <p style={{ color: "var(--gray-400)", fontSize: "0.78rem", textAlign: "center", marginTop: 12 }}>
                        <Link to="/login">Sign in</Link> as a student to apply
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="card" style={{ padding: 24 }}>
                <h3
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "var(--gray-700)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Details
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { label: "Job Type", value: opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1) },
                    { label: "Location", value: opportunity.location },
                    { label: "Salary/Stipend", value: opportunity.stipend },
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

      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Apply for {opportunity.title}</h2>
              <button className="modal-close" onClick={() => setShowApplyModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label className="form-label">Cover Note (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tell them why you're excited about this role..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
