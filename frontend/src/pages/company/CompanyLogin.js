import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { loginCompany, saveCompanyToken } from "../../api/company";

export default function CompanyLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await loginCompany(form);
      saveCompanyToken(res.data.access_token, res.data.company_id);
      navigate("/company/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 440 }}>
          {params.get("registered") && (
            <div style={{ background: "var(--mint-light)", border: "1px solid #A7F3D0",
              borderRadius: "var(--radius)", padding: "14px 18px", color: "var(--mint)",
              fontWeight: 600, marginBottom: 20, textAlign: "center" }}>
              ✅ Registered! Wait for admin approval before logging in.
            </div>
          )}

          <div className="card" style={{ padding: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏢</div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.5rem", fontWeight: 800 }}>
                Company Login
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", marginTop: 6 }}>
                Access your hiring dashboard
              </p>
            </div>

            {error && (
              <div style={{ background: "var(--rose-light)", border: "1px solid #FECDD3",
                borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--rose)",
                fontSize: "0.875rem", marginBottom: 20 }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Company Email *</label>
                <input type="email" className="form-input" placeholder="hr@company.com"
                  value={form.email} required onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" placeholder="••••••••"
                  value={form.password} required onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Logging in..." : "Login to Dashboard"}
              </button>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Link
                  to="/forgot-password/company"
                  style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}
                >
                  Forgot your password?
                </Link>
              </div>
            </form>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--gray-500)" }}>
              New company?{" "}
              <Link to="/company/register" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                Register here →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}