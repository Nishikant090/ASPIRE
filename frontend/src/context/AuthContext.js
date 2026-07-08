/**
 * AuthContext — global authentication state for Aspire Job Portal
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  apiClient,
  clearAuthStorage,
  getDashboardForRole,
  logoutSession,
  persistAuth,
  readAuthState,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readAuthState());
  const [initializing, setInitializing] = useState(true);

  const syncFromStorage = useCallback(() => {
    setAuth(readAuthState());
  }, []);

  const login = useCallback(({ token, role, studentId, companyId, email }) => {
    persistAuth({ token, role, studentId, companyId, email });
    syncFromStorage();
  }, [syncFromStorage]);

  const logout = useCallback(async () => {
    await logoutSession();
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const state = readAuthState();
      try {
        const res = await apiClient.post("/auth/refresh");
        if (!active) return;
        const { access_token, role, student_id, company_id, email } = res.data;
        persistAuth({
          token: access_token,
          role: role || state.role,
          studentId: student_id ?? state.studentId,
          companyId: company_id ?? state.companyId,
          email: email || state.email,
        });
        syncFromStorage();
      } catch {
        if (active && state.token) {
          clearAuthStorage();
          syncFromStorage();
        }
      } finally {
        if (active) setInitializing(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [syncFromStorage]);

  useEffect(() => {
    const onExpired = () => syncFromStorage();
    window.addEventListener("aspire:auth-expired", onExpired);
    return () => window.removeEventListener("aspire:auth-expired", onExpired);
  }, [syncFromStorage]);

  const value = useMemo(
    () => ({
      token: auth.token,
      role: auth.role,
      email: auth.email,
      studentId: auth.studentId ? Number(auth.studentId) : null,
      companyId: auth.companyId ? Number(auth.companyId) : null,
      isAuthenticated: Boolean(auth.token && auth.role),
      isStudent: auth.role === "student",
      isCompany: auth.role === "company",
      isAdmin: auth.role === "admin",
      initializing,
      login,
      logout,
      getDashboardPath: () => getDashboardForRole(auth.role),
    }),
    [auth, initializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
