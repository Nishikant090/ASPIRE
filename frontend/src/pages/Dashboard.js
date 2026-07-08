/**
 * Dashboard.js - Enhanced student dashboard
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getStudentMe,
  getMyApplications,
  getRecommendedJobs,
  getSavedJobs,
  getNotifications,
  unsaveJob,
  withdrawOpportunityApplication,
} from "../api";
import { withdrawCompanyApplication } from "../api/company";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import OpportunityCard from "../components/OpportunityCard";

const STATUS_CONFIG = {
  Applied: { class: "badge-applied", icon: "📤" },
  "Under Review": { class: "badge-under-review", icon: "🔍" },
  Shortlisted: { class: "badge-applied", icon: "⭐" },
  "Interview Scheduled": { class: "badge-under-review", icon: "📅" },
  Selected: { class: "badge-selected", icon: "🎉" },
  Rejected: { class: "badge-rejected", icon: "❌" },
};

function profileCompletion(student) {
  const fields = ["full_name", "college_email", "college_name", "branch", "skills", "graduation_year", "linkedin_url", "resume_path"];
  const filled = fields.filter((f) => student[f] || student[f === "full_name" ? "name" : f]).length;
  return Math.round((filled / fields.length) * 100);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [studentRes, appsRes, recRes, savedRes, notifRes] = await Promise.all([
        getStudentMe(),
        getMyApplications(),
        getRecommendedJobs().catch(() => ({ data: [] })),
        getSavedJobs().catch(() => ({ data: [] })),
        getNotifications().catch(() => ({ data: [] })),
      ]);
      setStudent(studentRes.data);
      setApplications(appsRes.data);
      setRecommended(recRes.data || []);
      setSavedJobs(savedRes.data || []);
      setNotifications(notifRes.data || []);
    } catch {
      setToast({ message: "Failed to load dashboard", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (app) => {
    if (!window.confirm("Withdraw this application?")) return;
    setWithdrawing(app.id);
    try {
      if (app.application_type === "company_job") {
        await withdrawCompanyApplication(app.id);
      } else {
        await withdrawOpportunityApplication(app.id);
      }
      setToast({ message: "Application withdrawn", type: "success" });
      loadDashboard();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Could not withdraw", type: "error" });
    } finally {
      setWithdrawing(null);
    }
  };

  const handleUnsave = async (savedId) => {
    try {
      await unsaveJob(savedId);
      setSavedJobs((prev) => prev.filter((s) => s.id !== savedId));
      setToast({ message: "Removed from saved jobs", type: "success" });
    } catch {
      setToast({ message: "Could not remove saved job", type: "error" });
    }
  };

  const openApplication = (app) => {
    navigate(app.application_type === "company_job" ? `/company-job/${app.job_id}` : `/opportunity/${app.job_id}`);
  };

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const completion = student ? profileCompletion(student) : 0;
  const upcomingDeadlines = savedJobs.filter((s) => s.job?.deadline).slice(0, 3);

  if (loading) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: 120 }}>
        <div className="spinner" />
        <p style={{ color: "var(--gray-400)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="loading-wrapper" style={{ paddingTop: 120 }}>
        <p style={{ color: "var(--gray-500)" }}>Unable to load profile.</p>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "applications", label: `Applications (${applications.length})` },
    { id: "saved", label: `Saved (${savedJobs.length})` },
    { id: "notifications", label: `Updates (${notifications.filter((n) => !n.is_read).length})` },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ background: "linear-gradient(135deg, #0F1B2D, #1A2D45)", padding: "40px 0", color: "white", marginTop: 72 }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                width: 72, height: 72, background: "linear-gradient(135deg, var(--indigo), #7C3AED)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {student.name.charAt(0)}
              </div>
              <div>
                <p style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>WELCOME BACK</p>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.6rem", fontWeight: 800, marginBottom: 4 }}>{student.name}</h1>
                <p style={{ color: "#94A3B8", fontSize: "0.9rem" }}>{student.branch} · {student.college}</p>
                {email && <p style={{ color: "#64748B", fontSize: "0.8rem", marginTop: 4 }}>{email}</p>}
              </div>
            </div>
            <Link to="/browse" className="btn btn-primary">Browse Jobs →</Link>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 24 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Applied", count: applications.length, icon: "📋" },
              { label: "Under Review", count: statusCounts["Under Review"] || 0, icon: "🔍" },
              { label: "Shortlisted", count: statusCounts["Shortlisted"] || 0, icon: "⭐" },
              { label: "Selected", count: statusCounts["Selected"] || 0, icon: "🎉" },
              { label: "Profile", count: `${completion}%`, icon: "✅" },
            ].map(({ label, count, icon }) => (
              <div key={label} className="stat-card" style={{ padding: 16 }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{icon}</div>
                <div className="stat-number" style={{ fontSize: "1.4rem" }}>{count}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="filter-bar" style={{ marginBottom: 24 }}>
            {tabs.map((t) => (
              <button key={t.id} className={`filter-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h2 className="section-title">Recommended for You</h2>
              </div>
              {recommended.length === 0 ? (
                <p style={{ color: "var(--gray-500)", marginBottom: 32 }}>Complete your profile skills to get personalized recommendations.</p>
              ) : (
                <div className="opp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
                  {recommended.slice(0, 3).map((job) => (
                    <OpportunityCard key={job.unique_key} opportunity={job} />
                  ))}
                </div>
              )}
              {upcomingDeadlines.length > 0 && (
                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>⏰ Upcoming Deadlines</h3>
                  {upcomingDeadlines.map((s) => (
                    <div key={s.id} style={{ fontSize: "0.875rem", color: "var(--gray-600)", marginBottom: 6 }}>
                      {s.job?.title} — deadline {s.job?.deadline}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "applications" && (
            applications.length === 0 ? (
              <div className="empty-state card"><div className="empty-icon">📭</div><h3>No applications yet</h3><button className="btn btn-primary" onClick={() => navigate("/browse")}>Browse Opportunities</button></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {applications.map((app) => {
                  const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG["Applied"];
                  return (
                    <div key={`${app.application_type}-${app.id}`} className="card" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ cursor: "pointer", flex: 1 }} onClick={() => openApplication(app)}>
                          <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{app.title}</h4>
                          <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>{app.company_name} · {app.location}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className={`opp-type-badge ${statusConf.class}`}>{statusConf.icon} {app.status}</span>
                          {app.can_withdraw && (
                            <button className="btn btn-ghost" style={{ fontSize: "0.78rem", marginTop: 8, display: "block" }} disabled={withdrawing === app.id} onClick={() => handleWithdraw(app)}>
                              {withdrawing === app.id ? "..." : "Withdraw"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {activeTab === "saved" && (
            savedJobs.length === 0 ? (
              <div className="empty-state card"><div className="empty-icon">🔖</div><h3>No saved jobs</h3><button className="btn btn-primary" onClick={() => navigate("/browse")}>Browse Jobs</button></div>
            ) : (
              <div className="opp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {savedJobs.filter((s) => s.job).map((s) => (
                  <div key={s.id} style={{ position: "relative" }}>
                    <OpportunityCard opportunity={s.job} />
                    <button className="btn btn-ghost" style={{ position: "absolute", top: 8, right: 8, fontSize: "0.75rem" }} onClick={() => handleUnsave(s.id)}>✕</button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === "notifications" && (
            notifications.length === 0 ? (
              <div className="empty-state card"><div className="empty-icon">🔔</div><h3>No notifications yet</h3></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notifications.map((n) => (
                  <div key={n.id} className="card" style={{ padding: 16, opacity: n.is_read ? 0.7 : 1, borderLeft: n.is_read ? "none" : "3px solid var(--indigo)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{n.title}</div>
                    <div style={{ color: "var(--gray-600)", fontSize: "0.85rem", marginTop: 4 }}>{n.message}</div>
                    <div style={{ color: "var(--gray-400)", fontSize: "0.75rem", marginTop: 6 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
