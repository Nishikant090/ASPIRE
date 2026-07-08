/**
 * AdminStudents.js - Student management
 */

import { useEffect, useState } from "react";
import { getAdminStudents, updateStudentStatus } from "../../api/company";
import Toast from "../../components/Toast";

const STATUS_BADGE = {
  pending: "badge-under-review",
  active: "badge-selected",
  blocked: "badge-rejected",
};

function DetailField({ label, value, href }) {
  const display = value || "—";
  return (
    <div>
      <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.4px" }}>
        {label}
      </div>
      {href && value ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.88rem", color: "var(--indigo)", wordBreak: "break-all" }}>
          {display}
        </a>
      ) : (
        <div style={{ fontSize: "0.88rem", color: "var(--gray-700)", wordBreak: "break-word" }}>{display}</div>
      )}
    </div>
  );
}

function BoolBadge({ value, trueLabel, falseLabel }) {
  return (
    <span className={`opp-type-badge ${value ? "badge-selected" : "badge-under-review"}`} style={{ fontSize: "0.75rem" }}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function StudentCard({ student, onStatus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--indigo-light)",
              color: "var(--indigo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(student.full_name || "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{student.full_name}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--gray-500)", wordBreak: "break-all" }}>{student.college_email}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 2 }}>
              {student.college_name || "No college"} · {student.branch || "No branch"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`opp-type-badge ${STATUS_BADGE[student.status] || ""}`}>{student.status}</span>
          <span style={{ color: "var(--gray-400)", fontSize: "0.85rem" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--gray-100)", padding: "20px 20px 18px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 18,
              marginBottom: 20,
            }}
          >
            <DetailField label="Student ID" value={String(student.id)} />
            <DetailField label="Username" value={student.username} />
            <DetailField label="Personal Email" value={student.personal_email} href={student.personal_email ? `mailto:${student.personal_email}` : null} />
            <DetailField label="College Email" value={student.college_email} href={student.college_email ? `mailto:${student.college_email}` : null} />
            <DetailField label="College" value={student.college_name} />
            <DetailField label="Branch" value={student.branch} />
            <DetailField label="Year" value={student.year} />
            <DetailField label="Semester" value={student.semester} />
            <DetailField label="Graduation Year" value={student.graduation_year} />
            <DetailField label="Roll Number" value={student.roll_number} />
            <DetailField label="Skills" value={student.skills} />
            <DetailField label="LinkedIn" value={student.linkedin_url} href={student.linkedin_url || null} />
            <DetailField label="GitHub" value={student.github_url} href={student.github_url || null} />
            <DetailField label="Portfolio" value={student.portfolio_url} href={student.portfolio_url || null} />
            <DetailField label="Resume" value={student.resume_path} href={student.resume_path || null} />
            <DetailField label="Profile Picture" value={student.profile_picture} href={student.profile_picture || null} />
            <DetailField label="T&P Head Name" value={student.tnp_head_name} />
            <DetailField label="T&P Head Phone" value={student.tnp_head_phone} href={student.tnp_head_phone ? `tel:${student.tnp_head_phone}` : null} />
            <DetailField
              label="Registered On"
              value={student.created_at ? new Date(student.created_at).toLocaleString() : ""}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
            <BoolBadge value={student.is_email_verified} trueLabel="Personal email verified" falseLabel="Personal email not verified" />
            <BoolBadge value={student.is_college_email_verified} trueLabel="College email verified" falseLabel="College email not verified" />
            <BoolBadge value={student.is_active} trueLabel="Account active" falseLabel="Account inactive" />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
            {student.status !== "active" && (
              <button className="btn btn-success btn-sm" onClick={() => onStatus(student.id, "active")}>
                Activate
              </button>
            )}
            {student.status !== "blocked" && (
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--rose)" }} onClick={() => onStatus(student.id, "blocked")}>
                Block
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    getAdminStudents()
      .then((r) => setStudents(r.data))
      .catch(() => setToast({ message: "Failed to load students", type: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await updateStudentStatus(id, status);
      setToast({ message: `Student ${status}`, type: "success" });
      load();
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;

  return (
    <div>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", marginBottom: 8 }}>
        Student Management
      </h1>
      <p style={{ color: "var(--gray-500)", marginBottom: 24, fontSize: "0.9rem" }}>
        {students.length} registered student{students.length !== 1 ? "s" : ""}. Click a row to view full details.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {students.map((s) => (
          <StudentCard key={s.id} student={s} onStatus={handleStatus} />
        ))}
        {students.length === 0 && (
          <div className="empty-state card" style={{ padding: 40 }}>
            <p>No students registered yet.</p>
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
