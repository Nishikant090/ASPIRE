/**
 * PasswordInput.js - Password field with show/hide toggle and strength indicator
 * Reusable component used on reset password pages
 */

import { useState } from "react";

function getStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)                          score++;
  if (password.length >= 12)                         score++;
  if (/[A-Z]/.test(password))                        score++;
  if (/[a-z]/.test(password))                        score++;
  if (/\d/.test(password))                           score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

const STRENGTH_CONFIG = {
  weak:   { color: "#F43F5E", label: "Weak",   width: "33%"  },
  medium: { color: "#F59E0B", label: "Medium",  width: "66%"  },
  strong: { color: "#10B981", label: "Strong",  width: "100%" },
};

export default function PasswordInput({ value, onChange, placeholder = "New Password", label = "New Password *" }) {
  const [show, setShow] = useState(false);
  const strength        = getStrength(value);
  const conf            = strength ? STRENGTH_CONFIG[strength] : null;

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>

      {/* Input with show/hide toggle */}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          className="form-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position  : "absolute", right: 12, top: "50%",
            transform : "translateY(-50%)",
            background: "none", border: "none",
            cursor    : "pointer", color: "var(--gray-400)",
            fontSize  : "1rem", padding: 0,
          }}
          title={show ? "Hide password" : "Show password"}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>

      {/* Strength bar */}
      {value && conf && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, background: "var(--gray-200)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: conf.width,
              background: conf.color,
              borderRadius: 99, transition: "all 0.3s ease"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>
              Password strength
            </span>
            <span style={{ fontSize: "0.75rem", color: conf.color, fontWeight: 600 }}>
              {conf.label}
            </span>
          </div>
        </div>
      )}

      {/* Requirements checklist */}
      {value && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          {[
            { label: "8+ chars",       ok: value.length >= 8                },
            { label: "Uppercase",      ok: /[A-Z]/.test(value)              },
            { label: "Lowercase",      ok: /[a-z]/.test(value)              },
            { label: "Number",         ok: /\d/.test(value)                 },
            { label: "Special char",   ok: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(value) },
          ].map(({ label, ok }) => (
            <span key={label} style={{
              fontSize: "0.75rem",
              color   : ok ? "var(--mint)" : "var(--gray-400)",
              fontWeight: ok ? 600 : 400,
            }}>
              {ok ? "✓" : "○"} {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}