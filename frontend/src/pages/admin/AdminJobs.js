/**
 * AdminJobs.js - All company-posted jobs monitoring
 */

import { useEffect, useState } from "react";
import { getAllCompanyJobs, adminDeleteJob } from "../../api/company";
import Toast from "../../components/Toast";

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    getAllCompanyJobs()
      .then((r) => setJobs(r.data))
      .catch(() => setToast({ message: "Failed to load jobs", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this job permanently?")) return;
    try {
      await adminDeleteJob(id);
      setToast({ message: "Job deleted", type: "success" });
      load();
    } catch {
      setToast({ message: "Failed to delete job", type: "error" });
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;

  return (
    <div>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", marginBottom: 24 }}>Job Monitoring</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs.map((job) => (
          <div key={job.id} className="card" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>{job.title}</h3>
              <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
                {job.company?.name || "Company"} · {job.location} · {job.status}
              </p>
            </div>
            <button className="btn btn-ghost" style={{ color: "var(--rose)" }} onClick={() => handleDelete(job.id)}>Delete</button>
          </div>
        ))}
        {jobs.length === 0 && <div className="empty-state card"><p>No company jobs posted yet.</p></div>}
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
