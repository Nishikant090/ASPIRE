/**
 * Dashboard.js - Student personal dashboard
 * Shows profile, applied jobs, and application status tracking
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudent, getStudentByEmail, getStudentApplications } from "../api";

const STATUS_CONFIG = {
  "Applied": { class: "badge-applied", icon: "📤" },
  "Under Review": { class: "badge-under-review", icon: "🔍" },
  "Selected": { class: "badge-selected", icon: "🎉" },
  "Rejected": { class: "badge-rejected", icon: "❌" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(localStorage.getItem("studentEmail") || "");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");

  // Load student from localStorage or prompt for email
  useEffect(() => {
    const savedId = localStorage.getItem("studentId");
    if (savedId) {
      loadStudent(savedId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadStudent = async (id) => {
    setLoading(true);
    try {
      const [studentRes, appsRes] = await Promise.all([
        getStudent(id),
        getStudentApplications(id),
      ]);
      setStudent(studentRes.data);
      setApplications(appsRes.data);
    } catch {
      localStorage.removeItem("studentId");
      localStorage.removeItem("studentEmail");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLookup = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await getStudentByEmail(emailInput);
      localStorage.setItem("studentId", res.data.id);
      localStorage.setItem("studentEmail", emailInput);
      loadStudent(res.data.id);
    } catch {
      setError("No account found. Please sign in first.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentEmail");
    setStudent(null);
    setApplications([]);
    setEmailInput("");
  };

  // Status summary counts
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: 120 }}>
        <div className="spinner" />
        <p style={{ color: "var(--gray-400)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  // If no student is logged in, show login form
  if (!student) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div className="container">
            <h1>Student Dashboard</h1>
            <p>View your applications and track your progress</p>
          </div>
        </div>
        <div className="section">
          <div className="container" style={{ maxWidth: 480 }}>
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎓</div>
              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.3rem", fontWeight: 800,
                  marginBottom: 8, color: "var(--gray-900)"
                }}
              >
                Access Your Dashboard
              </h2>
              <p style={{ color: "var(--gray-500)", marginBottom: 28, fontSize: "0.9rem" }}>
                Enter your email to view your applications. Apply to any opportunity first if you haven't already.
              </p>
              <form onSubmit={handleEmailLookup}>
                <div className="form-group">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    style={{ textAlign: "center" }}
                  />
                </div>
                {error && (
                  <p style={{ color: "var(--rose)", fontSize: "0.85rem", marginBottom: 12 }}>{error}</p>
                )}
                <button type="submit" className="btn btn-primary btn-full">
                  View My Dashboard
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F1B2D, #1A2D45)",
          padding: "40px 0",
          color: "white",
          marginTop: 72,
        }}
      >
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 72, height: 72,
                  background: "linear-gradient(135deg, var(--indigo), #7C3AED)",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.8rem", fontWeight: 700, color: "white",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  flexShrink: 0,
                }}
              >
                {student.name.charAt(0)}
              </div>
              <div>
                <p style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>
                  WELCOME BACK
                </p>
                <h1
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "1.6rem", fontWeight: 800, marginBottom: 4
                  }}
                >
                  {student.name}
                </h1>
                <p style={{ color: "#94A3B8", fontSize: "0.9rem" }}>
                  {student.branch} · {student.college} · {student.year}
                </p>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout} style={{ color: "#94A3B8" }}>
              Switch Account
            </button>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          {/* Stats summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Applied", count: applications.length, icon: "📋", color: "indigo" },
              { label: "Under Review", count: statusCounts["Under Review"] || 0, icon: "🔍", color: "amber" },
              { label: "Selected", count: statusCounts["Selected"] || 0, icon: "🎉", color: "mint" },
              { label: "Rejected", count: statusCounts["Rejected"] || 0, icon: "❌", color: "" },
            ].map(({ label, count, icon, color }) => (
              <div key={label} className="stat-card" style={{ padding: 20 }}>
                <div className={`stat-icon ${color}`} style={{ marginBottom: 8 }}>{icon}</div>
                <div className="stat-number" style={{ fontSize: "1.6rem" }}>{count}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }}>
            {/* Profile Card */}
            <div className="card" style={{ padding: 24 }}>
              <h3
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "0.85rem", fontWeight: 700,
                  color: "var(--gray-500)", textTransform: "uppercase",
                  letterSpacing: "0.5px", marginBottom: 20
                }}
              >
                Profile
              </h3>
              {[
                { label: "Email", value: student.email, icon: "✉️" },
                { label: "College", value: student.college, icon: "🏛️" },
                { label: "Branch", value: student.branch, icon: "📚" },
                { label: "Year", value: student.year, icon: "📅" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 600, marginBottom: 2 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--gray-700)", fontWeight: 500, wordBreak: "break-all" }}>
                    {value}
                  </div>
                </div>
              ))}
              {student.skills && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 600, marginBottom: 8 }}>
                    💡 Skills
                  </div>
                  <div className="opp-skills">
                    {student.skills.split(",").map((s, i) => (
                      <span key={i} className="skill-tag">{s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => navigate("/browse")}
                >
                  Browse More Roles
                </button>
              </div>
            </div>

            {/* Applications List */}
            <div>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h2 className="section-title">My Applications</h2>
                  <p className="section-subtitle">Track your application journey</p>
                </div>
              </div>

              {applications.length === 0 ? (
                <div className="empty-state card" style={{ background: "white" }}>
                  <div className="empty-icon">📭</div>
                  <h3>No applications yet</h3>
                  <p>Start applying to opportunities to see them here.</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => navigate("/browse")}
                  >
                    Browse Opportunities
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {applications.map((app) => {
                    const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG["Applied"];
                    return (
                      <div
                        key={app.id}
                        className="card"
                        style={{ padding: 20, cursor: "pointer" }}
                        onClick={() => navigate(`/opportunity/${app.opportunity.id}`)}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div
                              style={{
                                width: 48, height: 48,
                                background: "var(--indigo-light)",
                                borderRadius: "var(--radius)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "1.3rem", flexShrink: 0
                              }}
                            >
                              {app.opportunity.logo || "🏢"}
                            </div>
                            <div>
                              <h4
                                style={{
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                  fontSize: "0.95rem", fontWeight: 700,
                                  color: "var(--gray-900)", marginBottom: 2
                                }}
                              >
                                {app.opportunity.title}
                              </h4>
                              <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                                {app.opportunity.company} · {app.opportunity.location}
                              </p>
                              <p style={{ color: "var(--gray-400)", fontSize: "0.78rem", marginTop: 4 }}>
                                Applied {new Date(app.applied_at).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric"
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`opp-type-badge ${statusConf.class}`} style={{ flexShrink: 0 }}>
                            {statusConf.icon} {app.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
