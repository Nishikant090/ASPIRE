/**
 * Admin.js - Admin dashboard
 * Manage opportunities, view all applications, update statuses
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getAllApplications,
  updateApplicationStatus,
  getStats,
} from "../api";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import { getResetLogs } from "../api/passwordReset";

const TABS = ["overview", "opportunities", "applications", "reset-logs"];
export default function Admin({ defaultTab = "overview" }) {
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showOppModal, setShowOppModal] = useState(false);
  const [editOpp, setEditOpp] = useState(null); // null = create, object = edit
  const [resetLogs, setResetLogs] = useState([]);

  // Form state for create/edit opportunity
  const defaultForm = {
    title: "", company: "", description: "", skills: "",
    location: "", stipend: "", type: "internship", logo: "🏢"
  };
  const [oppForm, setOppForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "reset-logs") {
      getResetLogs()
        .then((r) => setResetLogs(r.data))
        .catch(console.error);
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oppsRes, appsRes, statsRes] = await Promise.all([
        getOpportunities(),
        getAllApplications(),
        getStats()
      ]);
      setOpportunities(oppsRes.data);
      setApplications(appsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditOpp(null);
    setOppForm(defaultForm);
    setShowOppModal(true);
  };

  const openEditModal = (opp) => {
    setEditOpp(opp);
    setOppForm({
      title: opp.title, company: opp.company, description: opp.description,
      skills: opp.skills, location: opp.location, stipend: opp.stipend,
      type: opp.type, logo: opp.logo || "🏢"
    });
    setShowOppModal(true);
  };

  const handleSaveOpp = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editOpp) {
        await updateOpportunity(editOpp.id, oppForm);
        setToast({ message: "Opportunity updated successfully!", type: "success" });
      } else {
        await createOpportunity(oppForm);
        setToast({ message: "Opportunity created successfully!", type: "success" });
      }
      setShowOppModal(false);
      loadData();
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteOpportunity(id);
      setToast({ message: "Opportunity deleted.", type: "success" });
      loadData();
    } catch {
      setToast({ message: "Failed to delete.", type: "error" });
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      setToast({ message: `Status updated to "${newStatus}"`, type: "success" });
    } catch {
      setToast({ message: "Failed to update status.", type: "error" });
    }
  };

  const LOGOS = ["🏢", "🚀", "💡", "📊", "⚡", "🎨", "☁️", "🤖", "📱", "🔬", "🌐", "💻"];
  const STATUS_OPTIONS = ["Applied", "Under Review", "Selected", "Rejected"];

  return (
    <div>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.4rem", marginBottom: 8 }}>
        {defaultTab === "applications" ? "Application Management" : "Curated Opportunities"}
      </h1>
      <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
        {defaultTab === "applications" ? "Review and update student applications" : "Manage admin-curated job listings"}
      </p>

      <div style={{ padding: 0 }}>
        <div>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "white",
              border: "1px solid var(--gray-200)",
              borderRadius: "var(--radius)",
              padding: 4,
              marginBottom: 28,
              width: "fit-content",
            }}
          >
            {TABS.map((tab) => {
              const tabLabels = {
  overview: "📊 Overview",
  opportunities: "💼 Opportunities",
  applications: "📋 Applications",
  companies: "🏢 Companies",
  "reset-logs": "🔐 Reset Logs"
};
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: activeTab === tab ? "var(--indigo)" : "transparent",
                    color: activeTab === tab ? "white" : "var(--gray-500)",
                    textTransform: "capitalize",
                  }}
                >
                  {tabLabels[tab] || `🏢 ${tab}`}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* ── Overview Tab ── */}
              {activeTab === "overview" && (
                <div>
                  <div className="stats-grid" style={{ marginBottom: 32 }}>
                    <div className="stat-card">
                      <div className="stat-icon indigo">💼</div>
                      <div className="stat-number">{stats?.total_jobs || 0}</div>
                      <div className="stat-label">Total Jobs</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon mint">🎓</div>
                      <div className="stat-number">{stats?.total_internships || 0}</div>
                      <div className="stat-label">Internships</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon amber">📋</div>
                      <div className="stat-number">{stats?.total_applications || 0}</div>
                      <div className="stat-label">Applications</div>
                    </div>
                  </div>

                  {/* Recent applications preview */}
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="section-title">Recent Applications</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab("applications")}>
                      View All
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Opportunity</th>
                          <th>Applied</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.slice(0, 5).map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>{app.student.name}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{app.student.email}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{app.opportunity.title}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{app.opportunity.company}</div>
                            </td>
                            <td style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                              {new Date(app.applied_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span className={`opp-type-badge badge-${app.status.toLowerCase().replace(" ", "-")}`}>
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {applications.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
                              No applications yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Opportunities Tab ── */}
              {activeTab === "opportunities" && (
                <div>
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="section-title">Manage Opportunities ({opportunities.length})</h2>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                      + Add Opportunity
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Opportunity</th>
                          <th>Type</th>
                          <th>Location</th>
                          <th>Stipend</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opp) => (
                          <tr key={opp.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: "1.2rem" }}>{opp.logo}</span>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>{opp.title}</div>
                                  <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{opp.company}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`opp-type-badge badge-${opp.type}`}>{opp.type}</span>
                            </td>
                            <td style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>{opp.location}</td>
                            <td style={{ color: "var(--gray-700)", fontSize: "0.875rem", fontWeight: 500 }}>
                              {opp.stipend}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(opp)}>
                                  ✏️ Edit
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(opp.id, opp.title)}>
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {opportunities.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
                              No opportunities. Add one!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Applications Tab ── */}
              {activeTab === "applications" && (
                <div>
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="section-title">All Applications ({applications.length})</h2>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Opportunity</th>
                          <th>College</th>
                          <th>Applied</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>{app.student.name}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{app.student.email}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{app.opportunity.title}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{app.opportunity.company}</div>
                            </td>
                            <td style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                              {app.student.college}
                              <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{app.student.year}</div>
                            </td>
                            <td style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                              {new Date(app.applied_at).toLocaleDateString()}
                            </td>
                            <td>
                              {/* Status dropdown for admin */}
                              <select
                                className="form-select"
                                style={{ padding: "5px 10px", fontSize: "0.8rem", width: "auto" }}
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                        {applications.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
                              No applications yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* ── Companies Tab ── */}
{activeTab === "companies" && (
  <div>
    <div className="section-header" style={{ marginBottom: 16 }}>
      <h2 className="section-title">Company Management</h2>
      <Link to="/admin/companies" className="btn btn-primary btn-sm">
        Open Full Company Panel →
      </Link>
    </div>
    <p style={{ color: "var(--gray-500)" }}>
      Use the full company panel to approve registrations, manage companies, and review all company jobs.
    </p>
  </div>
)}
{/* ── Reset Logs Tab ── */}
{activeTab === "reset-logs" && (
  <div>
    <div className="section-header" style={{ marginBottom: 16 }}>
      <h2 className="section-title">Password Reset Logs</h2>
      <button className="btn btn-secondary btn-sm" onClick={() =>
        getResetLogs().then(r => setResetLogs(r.data))
      }>
        🔄 Load Logs
      </button>
    </div>
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>User Type</th>
            <th>Action</th>
            <th>IP Address</th>
            <th>Time</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {resetLogs.map(log => (
            <tr key={log.id}>
              <td style={{ fontWeight: 500 }}>{log.email}</td>
              <td>
                <span className={`opp-type-badge ${log.user_type === "student" ? "badge-internship" : "badge-job"}`}>
                  {log.user_type}
                </span>
              </td>
              <td>
                <span className={`opp-type-badge ${
                  log.action === "password_changed" ? "badge-selected" :
                  log.action === "failed"           ? "badge-rejected" :
                  "badge-under-review"
                }`}>
                  {log.action}
                </span>
              </td>
              <td style={{ color: "var(--gray-400)", fontSize: "0.82rem", fontFamily: "monospace" }}>
                {log.ip_address || "—"}
              </td>
              <td style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td style={{ color: "var(--gray-500)", fontSize: "0.82rem" }}>
                {log.details || "—"}
              </td>
            </tr>
          ))}
          {resetLogs.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 48, color: "var(--gray-400)" }}>
                Click "Load Logs" to view password reset audit trail
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Opportunity Modal */}
      {showOppModal && (
        <div className="modal-overlay" onClick={() => setShowOppModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editOpp ? "Edit Opportunity" : "Add New Opportunity"}</h2>
              <button className="modal-close" onClick={() => setShowOppModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveOpp}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Job Title *</label>
                  <input
                    type="text" className="form-input" placeholder="Frontend Developer Intern"
                    value={oppForm.title} required
                    onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Company *</label>
                  <input
                    type="text" className="form-input" placeholder="TechCorp India"
                    value={oppForm.company} required
                    onChange={(e) => setOppForm({ ...oppForm, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the role, responsibilities, and what the candidate will learn or work on..."
                  value={oppForm.description} required
                  onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Skills Required *</label>
                <input
                  type="text" className="form-input"
                  placeholder="React.js, Python, SQL (comma-separated)"
                  value={oppForm.skills} required
                  onChange={(e) => setOppForm({ ...oppForm, skills: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text" className="form-input" placeholder="Bengaluru / Remote"
                    value={oppForm.location} required
                    onChange={(e) => setOppForm({ ...oppForm, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stipend / Salary *</label>
                  <input
                    type="text" className="form-input" placeholder="₹15,000/month or ₹12 LPA"
                    value={oppForm.stipend} required
                    onChange={(e) => setOppForm({ ...oppForm, stipend: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={oppForm.type}
                    onChange={(e) => setOppForm({ ...oppForm, type: e.target.value })}
                  >
                    <option value="internship">Internship</option>
                    <option value="job">Full-time Job</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Logo (emoji)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {LOGOS.map((logo) => (
                      <button
                        key={logo} type="button"
                        onClick={() => setOppForm({ ...oppForm, logo })}
                        style={{
                          width: 36, height: 36,
                          borderRadius: "var(--radius-sm)",
                          border: oppForm.logo === logo ? "2px solid var(--indigo)" : "1px solid var(--gray-200)",
                          background: oppForm.logo === logo ? "var(--indigo-light)" : "white",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                        }}
                      >
                        {logo}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowOppModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                  {saving ? "Saving..." : (editOpp ? "Update Opportunity" : "Create Opportunity")}
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
