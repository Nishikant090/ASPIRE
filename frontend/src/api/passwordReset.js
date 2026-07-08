/**
 * passwordReset.js - API calls for forgot/reset password flows
 */

import { apiClient } from "./client";

const API = apiClient;

export const studentForgotPassword = (email) =>
  API.post("/auth/student/forgot-password", { email });

export const studentValidateOTP = (email, otp) =>
  API.post("/auth/student/validate-otp", { email, otp });

export const studentResetPassword = (email, otp, new_password) =>
  API.post("/auth/student/reset-password", { email, otp, new_password });

export const companyForgotPassword = (email) =>
  API.post("/auth/company/forgot-password", { email });

export const companyValidateOTP = (email, otp) =>
  API.post("/auth/company/validate-otp", { email, otp });

export const companyResetPassword = (email, otp, new_password) =>
  API.post("/auth/company/reset-password", { email, otp, new_password });

export const getResetLogs = () => API.get("/auth/admin/reset-logs");
