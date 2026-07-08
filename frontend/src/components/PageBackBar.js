/**
 * PageBackBar.js - Back navigation bar for the current route
 */

import { useLocation } from "react-router-dom";
import BackButton from "./BackButton";
import { getBackNavigation } from "../utils/backNavigation";

export default function PageBackBar({ label, fallback, style }) {
  const { pathname } = useLocation();
  const config = getBackNavigation(pathname);

  if (!config) return null;

  return (
    <BackButton
      label={label ?? config.label ?? "Back"}
      fallback={fallback ?? config.fallback}
      style={{ marginBottom: 0, ...style }}
    />
  );
}
