/**
 * AdminOverview.js - Admin dashboard overview
 */

import { useEffect, useState } from "react";
import { getAdminStats } from "../../api/company";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then((r) => setStats(r.data)).catch(console.error);
  }, []);

  if (!stats) {
    return <div className="loading-wrapper"><div className="spinner" /></div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", marginBottom: 8 }}>Platform Overview</h1>
      <p style={{ color: "var(--gray-500)", marginBottom: 32 }}>Real-time platform analytics</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { label: "Total Students", value: stats.total_students, icon: "🎓", color: "indigo" },
          { label: "Total Companies", value: stats.total_companies, icon: "🏢", color: "mint" },
          { label: "Active Companies", value: stats.active_companies, icon: "✅", color: "mint" },
          { label: "Pending Approvals", value: stats.pending_approvals, icon: "⏳", color: "amber" },
          { label: "Active Jobs", value: stats.total_jobs, icon: "💼", color: "indigo" },
          { label: "Applications", value: stats.total_applications, icon: "📤", color: "amber" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="stat-card card" style={{ padding: 24 }}>
            <div className={`stat-icon ${color}`}>{icon}</div>
            <div className="stat-number" style={{ fontSize: "2rem" }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
