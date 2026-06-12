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
