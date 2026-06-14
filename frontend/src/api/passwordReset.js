/**
 * passwordReset.js - API calls for forgot/reset password flows
 */

import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000" });

// ─── Student ───────────────────────────────────────────────────────────────
export const studentForgotPassword = (email) =>
  API.post("/auth/student/forgot-password", { email });

export const studentValidateOTP = (email, otp) =>
  API.post("/auth/student/validate-otp", { email, otp });

export const studentResetPassword = (email, otp, new_password) =>
  API.post("/auth/student/reset-password", { email, otp, new_password });

// ─── Company ───────────────────────────────────────────────────────────────
export const companyForgotPassword = (email) =>
  API.post("/auth/company/forgot-password", { email });

export const companyValidateOTP = (email, otp) =>
  API.post("/auth/company/validate-otp", { email, otp });

export const companyResetPassword = (email, otp, new_password) =>
  API.post("/auth/company/reset-password", { email, otp, new_password });

// ─── Admin ─────────────────────────────────────────────────────────────────
export const getResetLogs = () =>
  axios.get("http://localhost:8000/auth/admin/reset-logs", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });