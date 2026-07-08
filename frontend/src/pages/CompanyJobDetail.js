/**
 * CompanyJobDetail.js - Company job details with authenticated apply flow
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCompanyJobDetail, getCompanyJobApplicationStatus, saveJob } from "../api";
import BackButton from "../components/BackButton";
import { applyToCompanyJob, uploadResume } from "../api/company";
import { getStudentMe } from "../api";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";

export default function CompanyJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isStudent } = useAuth();
  const [saved, setSaved] = useState(false);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState({ applied: false });
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(false);
  const [appForm, setAppForm] = useState({
    cover_note: "",
    resume: null,
    resumeName: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const jobRes = await getCompanyJobDetail(id);
        setJob(jobRes.data);

        if (isAuthenticated && isStudent) {
          const statusRes = await getCompanyJobApplicationStatus(id);
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

  const handleApplyClick = async () => {
    if (!isAuthenticated || !isStudent) {
      navigate("/login", { state: { from: `/company-job/${id}` } });
      return;
    }
    try {
      const res = await getStudentMe();
      setAppForm((prev) => ({
        ...prev,
        studentName: res.data.name,
        studentEmail: res.data.email,
      }));
    } catch {
      // Profile optional for modal display
    }
    setShowApplyModal(true);
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith(".pdf")) {
        setToast({ message: "Only PDF resumes allowed", type: "error" });
        return;
      }
      setAppForm((prev) => ({ ...prev, resume: file, resumeName: file.name }));
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      if (!appForm.resume) {
        setToast({ message: "Please upload your resume (PDF)", type: "error" });
        setApplying(false);
        return;
      }

      await applyToCompanyJob(job.id, appForm.cover_note);
      await uploadResume(job.id, appForm.resume);

      setShowApplyModal(false);
      setApplicationStatus({ applied: true, status: "Applied" });
      setToast({
        message: "Application submitted successfully! Check your dashboard for updates.",
        type: "success",
      });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to apply. Try again.";
      setToast({ message: msg, type: "error" });
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !isStudent) {
      navigate("/login", { state: { from: `/company-job/${id}` } });
      return;
    }
    try {
      await saveJob("company_job", parseInt(id, 10));
      setSaved(true);
      setToast({ message: "Job saved!", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Could not save job", type: "error" });
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
  const hasApplied = applicationStatus.applied;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <BackButton style={{ color: "white", borderColor: "rgba(255,255,255,0.2)" }} />
          <h1>{job.title}</h1>
          <p>
            {job.company?.name || "Company"} · {job.location}
          </p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 350px",
              gap: 32,
              alignItems: "start",
            }}
          >
            <div>
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
                    Company
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                    {job.company?.name || "Company"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", marginBottom: 4 }}>
                    Job Type
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
                      Application Deadline
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--gray-900)" }}>
                      {job.deadline}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-900)" }}>
                  Job Description
                </h2>
                <p style={{ lineHeight: 1.7, color: "var(--gray-700)", whiteSpace: "pre-wrap" }}>
                  {job.description}
                </p>
              </div>

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

              {job.eligibility && (
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-900)" }}>
                    Eligibility Criteria
                  </h2>
                  <p style={{ lineHeight: 1.7, color: "var(--gray-700)" }}>{job.eligibility}</p>
                </div>
              )}
            </div>

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
                  {hasApplied ? "Application Status" : "Ready to Apply?"}
                </h3>

                {hasApplied ? (
                  <>
                    <div
                      className="opp-type-badge badge-selected"
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "14px",
                        fontSize: "1rem",
                        marginBottom: 12,
                      }}
                    >
                      ✓ Applied
                      {applicationStatus.status && applicationStatus.status !== "Applied" && (
                        <span style={{ display: "block", fontSize: "0.85rem", marginTop: 4 }}>
                          Status: {applicationStatus.status}
                        </span>
                      )}
                    </div>
                    <button className="btn btn-primary btn-full" onClick={() => navigate("/dashboard")}>
                      View in Dashboard
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleApplyClick} className="btn btn-primary btn-full btn-lg">
                      Apply Now
                    </button>
                    <button className="btn btn-secondary btn-full" style={{ marginTop: 10 }} onClick={handleSave} disabled={saved}>
                      {saved ? "✓ Saved" : "🔖 Save Job"}
                    </button>
                    {!isAuthenticated && (
                      <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 12, textAlign: "center" }}>
                        <Link to="/login">Sign in</Link> as a student to apply
                      </p>
                    )}
                    {isAuthenticated && !isStudent && (
                      <p style={{ fontSize: "0.8rem", color: "var(--rose)", marginTop: 12, textAlign: "center" }}>
                        Only student accounts can apply to jobs
                      </p>
                    )}
                    {isStudent && (
                      <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 12, textAlign: "center" }}>
                        PDF resume required
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showApplyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowApplyModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ padding: 40, maxWidth: 500, width: "90%" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 24, color: "var(--gray-900)" }}>
              Apply to {job.title}
            </h2>
            <form onSubmit={handleApply}>
              <div className="form-group">
                <label className="form-label">Resume (PDF) *</label>
                <input type="file" accept=".pdf" className="form-input" onChange={handleResumeChange} required />
                {appForm.resumeName && (
                  <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginTop: 6 }}>
                    Selected: {appForm.resumeName}
                  </p>
                )}
              </div>
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
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={applying}>
                {applying ? "Submitting..." : "Submit Application"}
              </button>
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

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
