/**
 * GuestRoute — redirect authenticated users away from login/register pages
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageLoader } from "./LoadingSkeleton";

export default function GuestRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, role, initializing, getDashboardPath } = useAuth();

  if (initializing) {
    return <PageLoader message="Loading session..." />;
  }

  if (isAuthenticated) {
    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Navigate to={getDashboardPath()} replace />;
    }
    return <Navigate to={getDashboardPath()} replace />;
  }

  return children;
}
