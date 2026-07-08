/**
 * AdminLogs.js - System audit and reset logs
 */

import { useEffect, useState } from "react";
import { getAuditLogs } from "../../api/company";
import { getResetLogs } from "../../api/passwordReset";

export default function AdminLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [resetLogs, setResetLogs] = useState([]);
  const [tab, setTab] = useState("audit");

  useEffect(() => {
    getAuditLogs().then((r) => setAuditLogs(r.data)).catch(console.error);
    getResetLogs().then((r) => setResetLogs(r.data)).catch(console.error);
  }, []);

  const logs = tab === "audit" ? auditLogs : resetLogs;

  return (
    <div>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "1.6rem", marginBottom: 24 }}>System Logs</h1>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-btn ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>Platform Activity</button>
        <button className={`filter-btn ${tab === "reset" ? "active" : ""}`} onClick={() => setTab("reset")}>Password Resets</button>
      </div>
      <div className="card" style={{ overflow: "auto", maxHeight: 600 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--gray-200)", textAlign: "left" }}>
              {tab === "audit" ? (
                <><th style={{ padding: 10 }}>Time</th><th style={{ padding: 10 }}>Actor</th><th style={{ padding: 10 }}>Action</th><th style={{ padding: 10 }}>Details</th></>
              ) : (
                <><th style={{ padding: 10 }}>Time</th><th style={{ padding: 10 }}>Email</th><th style={{ padding: 10 }}>Action</th><th style={{ padding: 10 }}>IP</th></>
              )}
            </tr>
          </thead>
          <tbody>
            {tab === "audit" ? auditLogs.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--gray-100)" }}>
                <td style={{ padding: 10 }}>{new Date(l.created_at).toLocaleString()}</td>
                <td style={{ padding: 10 }}>{l.actor_email || l.actor_type}</td>
                <td style={{ padding: 10 }}>{l.action}</td>
                <td style={{ padding: 10 }}>{l.details || "—"}</td>
              </tr>
            )) : resetLogs.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid var(--gray-100)" }}>
                <td style={{ padding: 10 }}>{new Date(l.created_at).toLocaleString()}</td>
                <td style={{ padding: 10 }}>{l.email}</td>
                <td style={{ padding: 10 }}>{l.action}</td>
                <td style={{ padding: 10 }}>{l.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No logs yet.</p></div>}
      </div>
    </div>
  );
}
