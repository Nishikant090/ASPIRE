import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyProfile, updateCompanyProfile } from "../../api/company";
import Toast from "../../components/Toast";

const LOGOS = ["🏢","🚀","💡","⚡","🎨","☁️","🤖","📱","🔬","🌐","💻","📊"];

export default function CompanyProfile() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name:"",website:"",industry:"",description:"",logo:"🏢",location:"" });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    getCompanyProfile()
      .then((r) =>
        setForm({
          name: r.data.name,
          website: r.data.website || "",
          industry: r.data.industry || "",
          description: r.data.description || "",
          logo: r.data.logo || "🏢",
          location: r.data.location || "",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateCompanyProfile(form);
      setToast({ message: "Profile updated!", type: "success" });
    } catch {
      setToast({ message: "Failed to update profile", type: "error" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-wrapper" style={{ paddingTop: 120 }}><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container"><h1>Company Profile</h1><p>Update your company information</p></div>
      </div>
      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="card" style={{ padding: 36 }}>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" placeholder="https://" value={form.website} onChange={e => set("website", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" placeholder="Software, Fintech..." value={form.industry} onChange={e => set("industry", e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" placeholder="Bengaluru, Karnataka" value={form.location} onChange={e => set("location", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => set("description", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Logo (emoji)</label>
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
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}