/**
 * AdminLayout.js - Isolated admin panel with sidebar navigation
 */

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageBackBar from "../PageBackBar";

const NAV_ITEMS = [
  { path: "/admin", label: "Overview", icon: "📊", end: true },
  { path: "/admin/students", label: "Students", icon: "🎓" },
  { path: "/admin/companies", label: "Companies", icon: "🏢" },
  { path: "/admin/jobs", label: "All Jobs", icon: "💼" },
  { path: "/admin/opportunities", label: "Curated Jobs", icon: "📋" },
  { path: "/admin/applications", label: "Applications", icon: "📤" },
  { path: "/admin/logs", label: "System Logs", icon: "📜" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="page-wrapper" style={{ marginTop: 72 }}>
      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <aside
          style={{
            width: 240,
            background: "#0F1B2D",
            color: "white",
            padding: "24px 0",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748B", fontWeight: 600, letterSpacing: 1 }}>
              ASPIRE ADMIN
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.1rem", marginTop: 4 }}>
              Control Panel
            </div>
          </div>
          <nav style={{ padding: "16px 12px" }}>
            {NAV_ITEMS.map(({ path, label, icon, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 4,
                  textDecoration: "none",
                  color: isActive ? "white" : "#94A3B8",
                  background: isActive ? "rgba(79,70,229,0.3)" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.875rem",
                })}
              >
                <span>{icon}</span> {label}
              </NavLink>
            ))}
          </nav>
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <button
              className="btn btn-ghost btn-full"
              onClick={handleLogout}
              style={{ color: "#94A3B8", fontSize: "0.85rem" }}
            >
              Logout
            </button>
          </div>
        </aside>
        <main style={{ flex: 1, background: "var(--gray-50)", padding: "32px 40px", overflow: "auto" }}>
          <PageBackBar style={{ marginBottom: 16 }} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
