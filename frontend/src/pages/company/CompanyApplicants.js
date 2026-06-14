import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyJobs, getApplicants, updateApplicantStatus, isCompanyLoggedIn } from "../../api/company";
import Toast from "../../components/Toast";

const STATUSES = ["Applied","Under Review","Shortlisted","Interview Scheduled","Selected","Rejected"];

const STATUS_BADGE = {
  "Applied"            : "badge-applied",
  "Under Review"       : "badge-under-review",
  "Shortlisted"        : "badge-applied",
  "Interview Scheduled": "badge-under-review",
  "Selected"           : "badge-selected",
  "Rejected"           : "badge-rejected",
};

export default function CompanyApplicants() {
  const navigate = useNavigate();
  const [jobs,        setJobs]        = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants,  setApplicants]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState(null);
  const [filter,      setFilter]      = useState("");

  useEffect(() => {
    if (!isCompanyLoggedIn()) { navigate("/company/login"); return; }
    getMyJobs().then(r => {
      setJobs(r.data);
      if (r.data.length > 0) loadApplicants(r.data[0].id);
    });
  }, [navigate]);

  const loadApplicants = (jobId) => {
    setSelectedJob(jobId);
    setLoading(true);
    getApplicants(jobId).then(r => setApplicants(r.data)).finally(() => setLoading(false));
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicantStatus(appId, newStatus);
      setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      setToast({ message: `Status updated to "${newStatus}"`, type: "success" });
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  };

  const filtered = filter
    ? applicants.filter(a => a.status === filter)
    : applicants;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1>Applicants</h1>
          <p>Review and manage candidates for your jobs</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }}>

            {/* Job selector */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.85rem",
                fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase",
                letterSpacing: "0.5px", marginBottom: 16 }}>
                Select Job
              </h3>
              {jobs.map(job => (
                <div key={job.id} onClick={() => loadApplicants(job.id)}
                  style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer",
                    marginBottom: 6, background: selectedJob === job.id ? "var(--indigo-light)" : "transparent",
                    border: selectedJob === job.id ? "1px solid var(--indigo)" : "1px solid transparent",
                    transition: "all 0.15s" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem",
                    color: selectedJob === job.id ? "var(--indigo)" : "var(--gray-700)" }}>
                    {job.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: 2 }}>
                    {job.status} · {job.employment_type.replace("_"," ")}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <p style={{ color: "var(--gray-400)", fontSize: "0.85rem" }}>No jobs posted yet</p>
              )}
            </div>

            {/* Applicants table */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h2 className="section-title">
                  {applicants.length} Applicant{applicants.length !== 1 ? "s" : ""}
                </h2>
                <select className="form-select" style={{ width: "auto", padding: "6px 12px" }}
                  value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="loading-wrapper"><div className="spinner" /></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state card" style={{ background: "white" }}>
                  <div className="empty-icon">👥</div>
                  <h3>No applicants yet</h3>
                  <p>Share your job to attract candidates</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>Student</th><th>College</th><th>Skills</th><th>Applied</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map(app => (
                        <tr key={app.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{app.student.name}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{app.student.email}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.875rem" }}>{app.student.college}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{app.student.branch}</div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {(app.student.skills || "").split(",").slice(0,3).map((s,i) => (
                                <span key={i} className="skill-tag">{s.trim()}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>
                            {new Date(app.applied_at).toLocaleDateString()}
                          </td>
                          <td>
                            <select className="form-select"
                              style={{ padding: "5px 8px", fontSize: "0.8rem", width: "auto" }}
                              value={app.status}
                              onChange={e => handleStatusChange(app.id, e.target.value)}>
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}