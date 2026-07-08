import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanyDashboard, getCompanyProfile, getMyJobs } from "../../api/company";
import { useAuth } from "../../context/AuthContext";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCompanyDashboard(), getCompanyProfile(), getMyJobs()])
      .then(([s, p, j]) => {
        setStats(s.data);
        setProfile(p.data);
        setJobs(j.data);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (loading) return (
    <div className="loading-wrapper" style={{ paddingTop: 120 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0F1B2D,#1A2D45)", padding: "40px 0", marginTop: 72, color: "white" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.8rem" }}>
                {profile?.logo || "🏢"}
              </div>
              <div>
                <p style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 600, marginBottom: 4 }}>COMPANY DASHBOARD</p>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.6rem", fontWeight: 800 }}>
                  {profile?.name}
                </h1>
                {profile?.industry && <p style={{ color: "#94A3B8", fontSize: "0.9rem" }}>{profile.industry}</p>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/company/jobs/new" className="btn btn-primary">+ Post New Job</Link>
              <button className="btn btn-ghost" onClick={handleLogout} style={{ color: "#94A3B8" }}>Logout</button>
            </div>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Jobs",     value: stats?.total_jobs,         icon: "💼", color: "indigo" },
              { label: "Active Jobs",    value: stats?.active_jobs,        icon: "✅", color: "mint"   },
              { label: "Closed Jobs",    value: stats?.closed_jobs,        icon: "🔒", color: ""       },
              { label: "Applications",   value: stats?.total_applications, icon: "📋", color: "amber"  },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="stat-card">
                <div className={`stat-icon ${color}`}>{icon}</div>
                <div className="stat-number">{value ?? 0}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Post New Job",      icon: "➕", to: "/company/jobs/new"   },
              { label: "Manage Jobs",       icon: "💼", to: "/company/jobs"       },
              { label: "View Applicants",   icon: "👥", to: "/company/applicants" },
              { label: "Company Profile",   icon: "⚙️", to: "/company/profile"    },
            ].map(({ label, icon, to }) => (
              <Link key={label} to={to}
                style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)",
                  padding: "20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                  display: "block", color: "var(--gray-700)", fontWeight: 600, fontSize: "0.9rem",
                  textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--indigo)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--gray-200)"}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{icon}</div>
                {label}
              </Link>
            ))}
          </div>

          {/* Recent jobs */}
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h2 className="section-title">Recent Jobs</h2>
            <Link to="/company/jobs" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Job Title</th><th>Type</th><th>Location</th><th>Status</th><th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map(job => (
                  <tr key={job.id}>
                    <td><Link to={`/company/jobs/${job.id}`} style={{ color: "var(--indigo)", fontWeight: 600 }}>{job.title}</Link></td>
                    <td><span className={`opp-type-badge badge-${job.employment_type === "internship" ? "internship" : "job"}`}>
                      {job.employment_type.replace("_", " ")}
                    </span></td>
                    <td style={{ color: "var(--gray-500)" }}>{job.location}</td>
                    <td><span className={`opp-type-badge ${job.status === "active" ? "badge-selected" : "badge-rejected"}`}>
                      {job.status}
                    </span></td>
                    <td style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--gray-400)" }}>
                    No jobs posted yet. <Link to="/company/jobs/new" style={{ color: "var(--indigo)" }}>Post your first job →</Link>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}