/**
 * backNavigation.js - History-based back navigation helpers
 */

export const HOME_FALLBACK = "/";

export function canGoBackInHistory() {
  const idx = window.history.state?.idx;
  return typeof idx === "number" && idx > 0;
}

export function navigateBack(navigate, fallback = HOME_FALLBACK) {
  if (canGoBackInHistory()) {
    navigate(-1);
  } else {
    navigate(fallback);
  }
}

export function getBackNavigation(pathname) {
  if (pathname === "/") return null;

  // These pages render their own back control in the page header.
  if (/^\/opportunity\/[^/]+/.test(pathname)) return null;
  if (/^\/company-job\/[^/]+/.test(pathname)) return null;

  return { label: "Back", fallback: HOME_FALLBACK };
}
