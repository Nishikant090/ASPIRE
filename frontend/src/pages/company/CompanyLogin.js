import { useState } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { loginCompany } from "../../api/company";
import { getApiErrorMessage, parseApiDetail } from "../../api/errors";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function CompanyLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifyLink, setVerifyLink] = useState("");
  const successMessage = location.state?.message;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setVerifyLink("");
    try {
      const res = await loginCompany(form);
      login({
        token: res.data.access_token,
        role: "company",
        companyId: res.data.company_id,
        email: form.email,
      });
      const redirectTo = location.state?.from?.pathname || "/company/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const detail = parseApiDetail(err.response?.data?.detail);
      let message = getApiErrorMessage(err, "Invalid email or password.");

      if (detail.code === "EMAIL_NOT_VERIFIED" && detail.company_id) {
        message = detail.message || "Please complete email verification before logging in.";
        setVerifyLink(`/verify-company-email/${detail.company_id}`);
      } else {
        setVerifyLink("");
      }

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 440 }}>
          {(params.get("registered") || successMessage) && (
            <div
              style={{
                background: "var(--mint-light)",
                border: "1px solid #A7F3D0",
                borderRadius: "var(--radius)",
                padding: "14px 18px",
                color: "var(--mint)",
                fontWeight: 600,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              ✅ {successMessage || "Registered! Verify your email, then wait for admin approval before logging in."}
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

            {error && <div className="alert alert-error">{error}</div>}
            {verifyLink && (
              <div style={{ marginBottom: 16, textAlign: "center" }}>
                <Link to={verifyLink} className="btn btn-secondary btn-full">
                  Continue email verification
                </Link>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Company Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="hr@company.com"
                  value={form.email}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Logging in..." : "Login to Dashboard"}
              </button>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Link to="/forgot-password/company" style={{ color: "var(--gray-400)", fontSize: "0.82rem" }}>
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
