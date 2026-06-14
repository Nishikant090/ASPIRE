import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createJob, updateJob, getJob, isCompanyLoggedIn } from "../../api/company";
import Toast from "../../components/Toast";

const EMP_TYPES = [
  { value: "internship", label: "Internship" },
  { value: "full_time",  label: "Full Time"  },
  { value: "part_time",  label: "Part Time"  },
  { value: "contract",   label: "Contract"   },
  { value: "remote",     label: "Remote"     },
];

export default function PostJob() {
  const navigate  = useNavigate();
  const { id }    = useParams();   // if editing, id is present
  const isEdit    = !!id;

  const [form, setForm] = useState({
    title: "", description: "", skills: "", salary: "",
    location: "", employment_type: "internship",
    eligibility: "", deadline: "", openings: 1
  });
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    if (!isCompanyLoggedIn()) { navigate("/company/login"); return; }
    if (isEdit) {
      getJob(id).then(r => setForm({
        title: r.data.title, description: r.data.description,
        skills: r.data.skills, salary: r.data.salary,
        location: r.data.location, employment_type: r.data.employment_type,
        eligibility: r.data.eligibility || "", deadline: r.data.deadline || "",
        openings: r.data.openings || 1
      }));
    }
  }, [id, isEdit, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateJob(id, form);
        setToast({ message: "Job updated!", type: "success" });
      } else {
        await createJob(form);
        setToast({ message: "Job posted successfully!", type: "success" });
        setTimeout(() => navigate("/company/jobs"), 1500);
      }
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Failed", type: "error" });
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1>{isEdit ? "Edit Job" : "Post New Job"}</h1>
          <p>{isEdit ? "Update your job listing" : "Find the best student talent"}</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div className="card" style={{ padding: 36 }}>
            <form onSubmit={handleSubmit}>

              <p style={{ fontSize: "0.75rem", color: "var(--indigo)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
                Required Fields
              </p>

              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input className="form-input" placeholder="Frontend Developer Intern"
                  value={form.title} required onChange={e => set("title", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Job Description *</label>
                <textarea className="form-textarea" style={{ minHeight: 120 }}
                  placeholder="Describe the role, responsibilities, and what the candidate will do..."
                  value={form.description} required onChange={e => set("description", e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Required Skills *</label>
                <input className="form-input" placeholder="React.js, Python, SQL (comma-separated)"
                  value={form.skills} required onChange={e => set("skills", e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Salary / Stipend *</label>
                  <input className="form-input" placeholder="₹15,000/month or ₹8 LPA"
                    value={form.salary} required onChange={e => set("salary", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input className="form-input" placeholder="Bengaluru / Remote"
                    value={form.location} required onChange={e => set("location", e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Type *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EMP_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => set("employment_type", t.value)}
                      className={`filter-btn ${form.employment_type === t.value ? "active" : ""}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 16px" }}>
                Optional Details
              </p>

              <div className="form-group">
                <label className="form-label">Eligibility Criteria</label>
                <input className="form-input" placeholder="B.Tech CSE, 7+ CGPA, 2nd or 3rd year"
                  value={form.eligibility} onChange={e => set("eligibility", e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input type="date" className="form-input"
                    value={form.deadline} onChange={e => set("deadline", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Openings</label>
                  <input type="number" className="form-input" min={1} placeholder="1"
                    value={form.openings} onChange={e => set("openings", parseInt(e.target.value))} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn btn-secondary btn-full"
                  onClick={() => navigate("/company/jobs")}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? "Saving..." : (isEdit ? "Update Job" : "Post Job →")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}