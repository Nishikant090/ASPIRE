/**
 * company.js - All API calls for Company Portal
 */

import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000" });

// Attach company JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("companyToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ──────────────────────────────────────────────────────────────────
export const registerCompany  = (data) => API.post("/company/register", data);
export const loginCompany     = (data) => API.post("/company/login", data);

// ─── Profile ───────────────────────────────────────────────────────────────
export const getCompanyProfile    = ()     => API.get("/company/profile");
export const updateCompanyProfile = (data) => API.put("/company/profile", data);
export const getCompanyDashboard  = ()     => API.get("/company/dashboard");

// ─── Jobs ──────────────────────────────────────────────────────────────────
export const getMyJobs      = ()            => API.get("/company/jobs");
export const createJob      = (data)        => API.post("/company/jobs", data);
export const getJob         = (id)          => API.get(`/company/jobs/${id}`);
export const updateJob      = (id, data)    => API.put(`/company/jobs/${id}`, data);
export const deleteJob      = (id)          => API.delete(`/company/jobs/${id}`);
export const toggleJobStatus = (id)         => API.patch(`/company/jobs/${id}/toggle`);

// ─── Applicants ────────────────────────────────────────────────────────────
export const getApplicants        = (jobId, status) =>
  API.get(`/company/jobs/${jobId}/applicants`, { params: { status } });
export const updateApplicantStatus = (appId, status) =>
  API.put(`/company/applicants/${appId}/status`, { status });

// ─── Public Jobs (for students) ────────────────────────────────────────────
export const getCompanyJobs = (params) =>
  axios.get("http://localhost:8000/company-jobs", { params });
export const getCompanyJobDetail = (jobId) =>
  axios.get(`http://localhost:8000/company-jobs/${jobId}`);
export const applyToCompanyJob = (jobId, studentId, coverNote = "") =>
  axios.post(`http://localhost:8000/company/jobs/${jobId}/apply`, null,
    { params: { student_id: studentId, cover_note: coverNote } });
export const uploadResume = (jobId, studentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axios.post(`http://localhost:8000/company/jobs/${jobId}/upload-resume`,
    formData,
    { params: { student_id: studentId }, headers: { "Content-Type": "multipart/form-data" } });
};

// ─── Admin ─────────────────────────────────────────────────────────────────
const adminToken = () => localStorage.getItem("token");
const adminHeaders = () => ({ Authorization: `Bearer ${adminToken()}` });

export const getAdminStats        = ()          =>
  axios.get("http://localhost:8000/admin/stats", { headers: adminHeaders() });
export const getAllCompanies       = ()          =>
  axios.get("http://localhost:8000/admin/companies", { headers: adminHeaders() });
export const updateCompanyStatus  = (id, status) =>
  axios.put(`http://localhost:8000/admin/companies/${id}/status`, { status }, { headers: adminHeaders() });
export const adminDeleteCompany   = (id)        =>
  axios.delete(`http://localhost:8000/admin/companies/${id}`, { headers: adminHeaders() });
export const getAllCompanyJobs     = ()          =>
  axios.get("http://localhost:8000/admin/jobs", { headers: adminHeaders() });

// ─── Token helpers ─────────────────────────────────────────────────────────
export const saveCompanyToken = (token, companyId) => {
  localStorage.setItem("companyToken",  token);
  localStorage.setItem("companyId",     companyId);
  localStorage.setItem("role",          "company");
};
export const isCompanyLoggedIn = () => !!localStorage.getItem("companyToken");
export const logoutCompany     = () => {
  localStorage.removeItem("companyToken");
  localStorage.removeItem("companyId");
  localStorage.removeItem("role");
};