import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMyJobs, deleteJob, toggleJobStatus, isCompanyLoggedIn } from "../../api/company";
import Toast from "../../components/Toast";

export default function CompanyJobs() {
  const navigate = useNavigate();
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    if (!isCompanyLoggedIn()) { navigate("/company/login"); return; }
    getMyJobs().then(r => setJobs(r.data)).finally(() => setLoading(false));
  }, [navigate]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    await deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
    setToast({ message: "Job deleted", type: "success" });
  };

  const handleToggle = async (id) => {
    const res = await toggleJobStatus(id);
    setJobs(prev => prev.map(j => j.id === id ? res.data : j));
    setToast({ message: `Job ${res.data.status}`, type: "success" });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1>Manage Jobs</h1>
          <p>Create, edit and manage your job postings</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <h2 className="section-title">Your Jobs ({jobs.length})</h2>
            <Link to="/company/jobs/new" className="btn btn-primary">+ Post New Job</Link>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Job</th><th>Type</th><th>Location</th><th>Openings</th><th>Deadline</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{job.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{job.salary}</div>
                      </td>
                      <td><span className="opp-type-badge badge-internship">{job.employment_type.replace("_"," ")}</span></td>
                      <td style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>{job.location}</td>
                      <td style={{ textAlign: "center" }}>{job.openings ?? "—"}</td>
                      <td style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>{job.deadline || "—"}</td>
                      <td><span className={`opp-type-badge ${job.status === "active" ? "badge-selected" : "badge-rejected"}`}>{job.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link to={`/company/jobs/${job.id}`} className="btn btn-ghost btn-sm">✏️</Link>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(job.id)}>
                            {job.status === "active" ? "🔒" : "🔓"}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(job.id, job.title)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "var(--gray-400)" }}>
                      No jobs yet. <Link to="/company/jobs/new" style={{ color: "var(--indigo)" }}>Post your first job →</Link>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}