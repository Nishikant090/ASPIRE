/**
 * api/index.js - Student & admin API service
 */

import { apiClient, persistAuth, readAuthState, clearAuthStorage, logoutSession } from "./client";

const API = apiClient;

// ─── Unified Jobs (single source of truth) ──────────────────────────────────

export const getUnifiedJobs = (params = {}) => API.get("/jobs", { params });
export const getFeaturedJobs = () => API.get("/jobs/featured");
export const getRecommendedJobs = () => API.get("/jobs/recommended");

// ─── Opportunities (admin-curated, legacy) ────────────────────────────────────

export const getOpportunities = (params = {}) => API.get("/opportunities", { params });
export const getFeaturedOpportunities = () => API.get("/opportunities/featured");
export const getOpportunity = (id) => API.get(`/opportunities/${id}`);
export const getOpportunityApplicationStatus = (id) =>
  API.get(`/opportunities/${id}/application-status`);
export const createOpportunity = (data) => API.post("/opportunities", data);
export const updateOpportunity = (id, data) => API.put(`/opportunities/${id}`, data);
export const deleteOpportunity = (id) => API.delete(`/opportunities/${id}`);

// ─── Company Jobs (public) ──────────────────────────────────────────────────

export const getCompanyJobs = (params = {}) => API.get("/company-jobs", { params });
export const getCompanyJobDetail = (jobId) => API.get(`/company-jobs/${jobId}`);
export const getCompanyJobApplicationStatus = (jobId) =>
  API.get(`/company-jobs/${jobId}/application-status`);

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = () => API.get("/stats");

// ─── Students ─────────────────────────────────────────────────────────────────

export const createStudent = (data) => API.post("/students", data);
export const getStudent = (id) => API.get(`/students/${id}`);
export const getStudentMe = () => API.get("/students/me");
export const getStudentByEmail = (email) => API.get(`/students/email/${email}`);

// ─── Applications ─────────────────────────────────────────────────────────────

export const applyToOpportunity = (data) => API.post("/applications", data);
export const getStudentApplications = (studentId) =>
  API.get(`/applications/student/${studentId}`);
export const getMyApplications = () => API.get("/students/me/applications");

// ─── Saved Jobs ───────────────────────────────────────────────────────────────

export const getSavedJobs = () => API.get("/students/me/saved-jobs");
export const saveJob = (jobSource, jobId) =>
  API.post("/students/me/saved-jobs", { job_source: jobSource, job_id: jobId });
export const unsaveJob = (savedId) => API.delete(`/students/me/saved-jobs/${savedId}`);

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = () => API.get("/notifications/me");
export const getUnreadCount = () => API.get("/notifications/unread-count");
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put("/notifications/read-all");
export const getMyOpportunityApplications = () => API.get("/applications/me");
export const withdrawOpportunityApplication = (appId) =>
  API.delete(`/applications/${appId}`);
export const getAllApplications = () => API.get("/applications");
export const updateApplicationStatus = (appId, status) =>
  API.put(`/applications/${appId}/status`, { status });

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerStudent = (data) => API.post("/auth/register", data);
export const getVerificationStatus = (studentId) => API.get(`/auth/verification-status/${studentId}`);
export const sendVerificationOTP = (email) =>
  API.post("/auth/verify-email/send", { email });
export const confirmVerificationOTP = (email, otp) =>
  API.post("/auth/verify-email/confirm", { email, otp });
export const getCompanyVerificationStatus = (companyId) =>
  API.get(`/auth/company/verification-status/${companyId}`);
export const sendCompanyVerificationOTP = (email) =>
  API.post("/auth/company/verify-email/send", { email });
export const confirmCompanyVerificationOTP = (email, otp) =>
  API.post("/auth/company/verify-email/confirm", { email, otp });
export const studentLogin = (collegeEmail, password) =>
  API.post("/auth/student/login", { college_email: collegeEmail, password });
export const getAuthMe = () => API.get("/auth/me");
export const adminLogin = (email, password) =>
  API.post("/auth/admin-login", { email, name: password });
export const refreshToken = () => API.post("/auth/refresh");
export const logout = logoutSession;

/** Save JWT token after login (also used by AuthContext.login) */
export const saveAuthToken = (token, studentId, role = "student", email = "") => {
  persistAuth({
    token,
    role,
    studentId: studentId ?? undefined,
    email: email || readAuthState().email,
  });
};

export const getToken = () => readAuthState().token;
export const isLoggedIn = () => Boolean(readAuthState().token);
export const isAdmin = () => readAuthState().role === "admin";
export const isStudent = () => readAuthState().role === "student";

export { clearAuthStorage, readAuthState, persistAuth };
