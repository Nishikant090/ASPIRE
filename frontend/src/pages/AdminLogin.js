/**
 * AdminLogin.js - Admin login page
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api";
import { getApiErrorMessage } from "../api/errors";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await adminLogin(email, password);
      login({ token: res.data.access_token, role: "admin", email });
      navigate("/admin", { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(err, "Invalid admin email or password.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 420 }}>
          <div className="card" style={{ padding: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚙️</div>
              <h1
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "var(--gray-900)",
                }}
              >
                Admin Login
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", marginTop: 6 }}>
                Restricted to authorized administrators
              </p>
            </div>

            {error && (
              <div
                style={{
                  background: "var(--rose-light)",
                  border: "1px solid #FECDD3",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  color: "var(--rose)",
                  fontSize: "0.875rem",
                  marginBottom: 20,
                }}
              >
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Admin Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@aspire.com"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Logging in..." : "Login to Admin Panel"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
