/**
 * api/index.js - Axios API service
 * All API calls to the FastAPI backend are centralized here.
 */

import axios from "axios";

// Base URL for the FastAPI backend
const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Automatically attach JWT token to every request if one exists
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Opportunities ────────────────────────────────────────────────────────────

/** Fetch all opportunities with optional filters */
export const getOpportunities = (params = {}) =>
  API.get("/opportunities", { params });

/** Fetch 6 featured opportunities for home page */
export const getFeaturedOpportunities = () =>
  API.get("/opportunities/featured");

/** Get a single opportunity by ID */
export const getOpportunity = (id) => API.get(`/opportunities/${id}`);

/** Admin: Create a new opportunity */
export const createOpportunity = (data) => API.post("/opportunities", data);

/** Admin: Update an existing opportunity */
export const updateOpportunity = (id, data) =>
  API.put(`/opportunities/${id}`, data);

/** Admin: Delete an opportunity */
export const deleteOpportunity = (id) => API.delete(`/opportunities/${id}`);

// ─── Company Jobs ─────────────────────────────────────────────────────────────

/** Fetch all active company jobs with optional filters */
export const getCompanyJobs = (params = {}) =>
  API.get("/company-jobs", { params });

// ─── Stats ────────────────────────────────────────────────────────────────────

/** Get platform statistics */
export const getStats = () => API.get("/stats");

// ─── Students ─────────────────────────────────────────────────────────────────

/** Register a new student */
export const createStudent = (data) => API.post("/students", data);

/** Get student by ID */
export const getStudent = (id) => API.get(`/students/${id}`);

/** Find student by email */
export const getStudentByEmail = (email) =>
  API.get(`/students/email/${email}`);

// ─── Applications ─────────────────────────────────────────────────────────────

/** Submit an application */
export const applyToOpportunity = (data) => API.post("/applications", data);

/** Get all applications for a student */
export const getStudentApplications = (studentId) =>
  API.get(`/applications/student/${studentId}`);

/** Admin: Get all applications */
export const getAllApplications = () => API.get("/applications");

/** Admin: Update application status */
export const updateApplicationStatus = (appId, status) =>
  API.put(`/applications/${appId}/status`, { status });

// ─── Auth ──────────────────────────────────────────────────────────────────────

/** Step 1: Request OTP — works for both login and signup */
export const sendOTP = (email, name = "") =>
  API.post("/auth/send-otp", { email, name });

/** Step 2: Verify OTP — returns JWT token + student_id */
export const verifyOTP = (email, otp) =>
  API.post("/auth/verify-otp", { email, otp });

/** Admin login */
// Note: backend reuses SendOTPRequest — email = admin email, name = password
export const adminLogin = (email, password) =>
  API.post("/auth/admin-login", { email, name: password });

// ─── Token helpers ─────────────────────────────────────────────────────────────

/** Save JWT token and student info to localStorage after login */
export const saveAuthToken = (token, studentId, role = "student") => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  if (studentId) localStorage.setItem("studentId", studentId);
};

/** Read the saved JWT token */
export const getToken = () => localStorage.getItem("token");

/** Check if any user is logged in */
export const isLoggedIn = () => !!localStorage.getItem("token");

/** Check if logged-in user is admin */
export const isAdmin = () => localStorage.getItem("role") === "admin";

/** Log out: clear all auth data */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("studentId");
  localStorage.removeItem("studentEmail");
};
