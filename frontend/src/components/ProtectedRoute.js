/**
 * ProtectedRoute — role-based route guard for authenticated pages
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./LoadingSkeleton";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, initializing, getDashboardPath } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <PageLoader message="Loading session..." />;
  }

  if (!isAuthenticated) {
    const loginPath =
      allowedRoles?.includes("company")
        ? "/company/login"
        : allowedRoles?.includes("admin")
        ? "/admin/login"
        : "/login";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
}
