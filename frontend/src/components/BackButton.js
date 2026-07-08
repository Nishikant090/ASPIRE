/**
 * BackButton.js - Navigates to the previous page in history, with a home fallback
 */

import { useNavigate } from "react-router-dom";
import { HOME_FALLBACK, navigateBack } from "../utils/backNavigation";

export default function BackButton({ fallback = HOME_FALLBACK, label = "Back", style }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigateBack(navigate, fallback);
  };

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={handleClick}
      style={{ padding: "6px 12px", fontSize: "0.875rem", marginBottom: 16, ...style }}
    >
      ← {label}
    </button>
  );
}
