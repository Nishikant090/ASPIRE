/**
 * company.js - Company portal API calls
 */

import { apiClient, persistAuth, readAuthState, logoutSession } from "./client";

const API = apiClient;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerCompany = (data) => API.post("/company/register", data);
export const loginCompany = (data) => API.post("/company/login", data);

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getCompanyProfile = () => API.get("/company/profile");
export const updateCompanyProfile = (data) => API.put("/company/profile", data);
export const getCompanyDashboard = () => API.get("/company/dashboard");

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const getMyJobs = () => API.get("/company/jobs");
export const createJob = (data) => API.post("/company/jobs", data);
export const getJob = (id) => API.get(`/company/jobs/${id}`);
export const updateJob = (id, data) => API.put(`/company/jobs/${id}`, data);
export const deleteJob = (id) => API.delete(`/company/jobs/${id}`);
export const toggleJobStatus = (id) => API.patch(`/company/jobs/${id}/toggle`);

// ─── Applicants ───────────────────────────────────────────────────────────────

export const getApplicants = (jobId, status) =>
  API.get(`/company/jobs/${jobId}/applicants`, { params: { status } });
export const updateApplicantStatus = (appId, status) =>
  API.put(`/company/applicants/${appId}/status`, { status });
export const downloadApplicantResume = (appId) =>
  API.get(`/company/applicants/${appId}/resume`, { responseType: "blob" });

// ─── Student apply flow ───────────────────────────────────────────────────────

export const applyToCompanyJob = (jobId, coverNote = "") =>
  API.post(`/company/jobs/${jobId}/apply`, null, { params: { cover_note: coverNote } });

export const uploadResume = (jobId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post(`/company/jobs/${jobId}/upload-resume`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const withdrawCompanyApplication = (appId) =>
  API.delete(`/company/applications/${appId}`);

// ─── Admin (company management) ───────────────────────────────────────────────

export const getAdminStats = () => API.get("/admin/stats");
export const getAllCompanies = () => API.get("/admin/companies");
export const updateCompanyStatus = (id, status) =>
  API.put(`/admin/companies/${id}/status`, { status });
export const adminDeleteCompany = (id) => API.delete(`/admin/companies/${id}`);
export const getAllCompanyJobs = () => API.get("/admin/jobs");
export const adminDeleteJob = (id) => API.delete(`/admin/jobs/${id}`);
export const getAdminStudents = () => API.get("/admin/students");
export const updateStudentStatus = (id, status) =>
  API.put(`/admin/students/${id}/status`, null, { params: { status } });
export const getAuditLogs = () => API.get("/admin/audit-logs");

// ─── Token helpers ────────────────────────────────────────────────────────────

export const saveCompanyToken = (token, companyId, email = "") => {
  persistAuth({ token, role: "company", companyId, email });
};

export const isCompanyLoggedIn = () => readAuthState().role === "company";
export const logoutCompany = logoutSession;

export { readAuthState };
