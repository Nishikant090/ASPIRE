/**
 * Toast.js - Simple notification toast
 * Shows success or error messages temporarily
 */

import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{type === "success" ? "✅" : "❌"}</span>
      <span>{message}</span>
    </div>
  );
}
