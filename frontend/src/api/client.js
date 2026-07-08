/**
 * Shared Axios client with JWT + refresh token support.
 */

import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const AUTH_KEYS = {
  token: "aspire_token",
  role: "aspire_role",
  studentId: "aspire_student_id",
  companyId: "aspire_company_id",
  email: "aspire_email",
};

export const ROLE_DASHBOARDS = {
  student: "/dashboard",
  company: "/company/dashboard",
  admin: "/admin",
};

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise = null;

export function readAuthState() {
  return {
    token: localStorage.getItem(AUTH_KEYS.token),
    role: localStorage.getItem(AUTH_KEYS.role),
    studentId: localStorage.getItem(AUTH_KEYS.studentId),
    companyId: localStorage.getItem(AUTH_KEYS.companyId),
    email: localStorage.getItem(AUTH_KEYS.email),
  };
}

export function persistAuth({ token, role, studentId, companyId, email }) {
  clearAuthStorage();
  if (token) localStorage.setItem(AUTH_KEYS.token, token);
  if (role) localStorage.setItem(AUTH_KEYS.role, role);
  if (studentId) localStorage.setItem(AUTH_KEYS.studentId, String(studentId));
  if (companyId) localStorage.setItem(AUTH_KEYS.companyId, String(companyId));
  if (email) localStorage.setItem(AUTH_KEYS.email, email);
}

export function clearAuthStorage() {
  Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key));
  // Legacy keys from earlier versions
  ["token", "role", "studentId", "studentEmail", "companyToken", "companyId"].forEach((key) =>
    localStorage.removeItem(key)
  );
}

export function getDashboardForRole(role) {
  return ROLE_DASHBOARDS[role] || "/";
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then((res) => {
        const { access_token, role, student_id, company_id, email } = res.data;
        const current = readAuthState();
        persistAuth({
          token: access_token,
          role: role || current.role,
          studentId: student_id ?? current.studentId,
          companyId: company_id ?? current.companyId,
          email: email || current.email,
        });
        return access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const { token } = readAuthState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/logout") &&
      !original.url?.includes("/auth/student/login") &&
      !original.url?.includes("/auth/register") &&
      !original.url?.includes("/auth/admin-login") &&
      !original.url?.includes("/company/login") &&
      !original.url?.includes("/company/register")
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        clearAuthStorage();
        window.dispatchEvent(new Event("aspire:auth-expired"));
      }
    }
    return Promise.reject(error);
  }
);

export async function logoutSession() {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Clear local session even if server logout fails
  }
  clearAuthStorage();
}
