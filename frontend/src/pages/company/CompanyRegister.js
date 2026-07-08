import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerCompany } from "../../api/company";
import { getApiErrorMessage, parseApiDetail } from "../../api/errors";
import { useToast } from "../../context/ToastContext";

const LOGOS = ["🏢","🚀","💡","⚡","🎨","☁️","🤖","📱","🔬","🌐","💻","📊"];

export default function CompanyRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm_password: "", website: "",
    industry: "", description: "", logo: "🏢", location: ""
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirm_password) {
      const message = "Passwords do not match.";
      setError(message);
      showToast(message, "error");
      setLoading(false);
      return;
    }

    try {
      const res = await registerCompany(form);
      navigate(`/verify-company-email/${res.data.company_id}`, {
        replace: true,
        state: { email: res.data.email, message: res.data.message },
      });
    } catch (err) {
      const detail = parseApiDetail(err.response?.data?.detail);
      if (detail.code === "VERIFICATION_PENDING" && detail.company_id) {
        showToast(detail.message || "Finish email verification to activate your account.", "error");
        navigate(`/verify-company-email/${detail.company_id}`, {
          replace: true,
          state: { email: form.email },
        });
        return;
      }

      const message = getApiErrorMessage(err, "Registration failed. Please try again.");
      setError(message);
      showToast(message, "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="card" style={{ padding: 40 }}>

            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏢</div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.6rem", fontWeight: 800 }}>
                Register Your Company
              </h1>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", marginTop: 6 }}>
                Post jobs and find the best student talent
              </p>
            </div>

            {error && (
              <div style={{ background: "var(--rose-light)", border: "1px solid #FECDD3",
                borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--rose)",
                fontSize: "0.875rem", marginBottom: 20 }}>
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Required fields */}
              <p style={{ fontSize: "0.75rem", color: "var(--indigo)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
                Required Information
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input className="form-input" placeholder="TechCorp India"
                    value={form.name} required onChange={e => set("name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Email *</label>
                  <input type="email" className="form-input" placeholder="hr@techcorp.com"
                    value={form.email} required onChange={e => set("email", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" placeholder="Min 8 chars, upper, lower, number, symbol"
                  value={form.password} required onChange={e => set("password", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input type="password" className="form-input" placeholder="Re-enter password"
                  value={form.confirm_password} required onChange={e => set("confirm_password", e.target.value)} />
              </div>

              {/* Optional fields */}
              <p style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 16px" }}>
                Optional Details
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" placeholder="https://techcorp.com"
                    value={form.website} onChange={e => set("website", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" placeholder="Software, Fintech, EdTech..."
                    value={form.industry} onChange={e => set("industry", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="Bengaluru, Karnataka"
                  value={form.location} onChange={e => set("location", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Company Description</label>
                <textarea className="form-textarea" placeholder="Tell students about your company..."
                  value={form.description} onChange={e => set("description", e.target.value)} />
              </div>

              {/* Logo picker */}
              <div className="form-group">
                <label className="form-label">Company Logo (emoji)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {LOGOS.map(l => (
                    <button key={l} type="button" onClick={() => set("logo", l)}
                      style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)",
                        border: form.logo === l ? "2px solid var(--indigo)" : "1px solid var(--gray-200)",
                        background: form.logo === l ? "var(--indigo-light)" : "white",
                        cursor: "pointer", fontSize: "1.1rem" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Registering..." : "Register Company →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--gray-500)" }}>
              Already registered?{" "}
              <Link to="/company/login" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                Login →
              </Link>
            </p>

            <div style={{ marginTop: 16, padding: 14, background: "var(--amber-light)",
              borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "#92400E" }}>
              ⚠️ Verify your email after registration. Admin approval is required before you can post jobs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}