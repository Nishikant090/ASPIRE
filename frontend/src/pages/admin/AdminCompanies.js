import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllCompanies, updateCompanyStatus, adminDeleteCompany } from "../../api/company";
import Toast from "../../components/Toast";
import LoadingSkeleton from "../../components/LoadingSkeleton";

const STATUS_COLORS = {
  pending   : "badge-under-review",
  approved  : "badge-selected",
  rejected  : "badge-rejected",
  suspended : "badge-rejected",
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getAllCompanies()
      .then((r) => setCompanies(r.data))
      .catch(() => setError("Failed to load companies."))
      .finally(() => setLoading(false));
  }, []);

  const handleStatus = async (id, status) => {
    await updateCompanyStatus(id, status);
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    setToast({ message: `Company ${status}`, type: "success" });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete company "${name}"?`)) return;
    await adminDeleteCompany(id);
    setCompanies(prev => prev.filter(c => c.id !== id));
    setToast({ message: "Company deleted", type: "success" });
  };

  const pending  = companies.filter(c => c.status === "pending");
  const rest     = companies.filter(c => c.status !== "pending");

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1>⚙️ Manage Companies</h1>
          <p>Approve, suspend or remove company accounts</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">

          {/* Pending approvals */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 className="section-title">Pending Approvals</h2>
                <span style={{ background: "var(--amber-light)", color: "var(--amber)",
                  padding: "3px 10px", borderRadius: 99, fontSize: "0.78rem", fontWeight: 700 }}>
                  {pending.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pending.map(c => (
                  <div key={c.id} className="card" style={{ padding: 20, border: "2px solid var(--amber)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ fontSize: "1.8rem" }}>{c.logo || "🏢"}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{c.name}</div>
                          <div style={{ fontSize: "0.82rem", color: "var(--gray-400)" }}>{c.email}</div>
                          {c.industry && <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{c.industry} · {c.location}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleStatus(c.id, "approved")}>
                          ✅ Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatus(c.id, "rejected")}>
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                    {c.description && (
                      <p style={{ marginTop: 10, fontSize: "0.85rem", color: "var(--gray-500)", borderTop: "1px solid var(--gray-100)", paddingTop: 10 }}>
                        {c.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All companies table */}
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h2 className="section-title">All Companies ({companies.length})</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Company</th><th>Industry</th><th>Location</th><th>Status</th><th>Registered</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 48 }}><div className="spinner" style={{ margin: "0 auto" }} /></td></tr>
                ) : companies.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.3rem" }}>{c.logo || "🏢"}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>{c.industry || "—"}</td>
                    <td style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>{c.location || "—"}</td>
                    <td><span className={`opp-type-badge ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                    <td style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {c.status === "approved" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(c.id, "suspended")}>🔒 Suspend</button>
                        )}
                        {c.status === "suspended" && (
                          <button className="btn btn-success btn-sm" onClick={() => handleStatus(c.id, "approved")}>🔓 Activate</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.name)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}