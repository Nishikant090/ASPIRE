/**
 * VerifyEmail.js - One-time email verification for students and companies
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  confirmVerificationOTP,
  confirmCompanyVerificationOTP,
  getVerificationStatus,
  getCompanyVerificationStatus,
  sendVerificationOTP,
  sendCompanyVerificationOTP,
} from "../api";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { getApiErrorMessage, parseApiDetail } from "../api/errors";
import { useToast } from "../context/ToastContext";

export default function VerifyEmail() {
  const { studentId, companyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isCompany = location.pathname.includes("verify-company-email");
  const userId = isCompany ? companyId : studentId;

  const [status, setStatus] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const autoSentRef = useRef(false);

  const loginPath = isCompany ? "/company/login" : "/login";
  const registerPath = isCompany ? "/company/register" : "/register";
  const activeEmail =
    status?.college_email || status?.email || location.state?.collegeEmail || location.state?.email;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const loadStatus = useCallback(async () => {
    try {
      const res = isCompany
        ? await getCompanyVerificationStatus(userId)
        : await getVerificationStatus(userId);
      setStatus(res.data);
      setCooldown(res.data.resend_cooldown_seconds || 0);

      const verified = isCompany ? res.data.is_email_verified : res.data.is_fully_verified;
      if (verified) {
        navigate(loginPath, {
          replace: true,
          state: {
            message: isCompany
              ? "Email verified! Log in once admin approves your account."
              : "Account verified! Log in with your college email and password.",
          },
        });
      }
    } catch (err) {
      const detail = parseApiDetail(err.response?.data?.detail);
      const message =
        err.response?.status === 410 || detail.code === "VERIFICATION_EXPIRED"
          ? detail.message || "Registration expired. Please register again."
          : getApiErrorMessage(err, "Could not load verification status.");
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [isCompany, loginPath, navigate, userId]);

  const handleSend = useCallback(async (isAuto = false) => {
    if (!activeEmail || cooldown > 0) return;
    setSending(true);
    if (!isAuto) {
      setError("");
      setMessage("");
    }
    try {
      const res = isCompany
        ? await sendCompanyVerificationOTP(activeEmail)
        : await sendVerificationOTP(activeEmail);
      setMessage(res.data.message || "Verification code sent.");
      setCooldown(60);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to send verification code.");
      setError(message);
      showToast(message, "error");
      if (err.response?.status === 429) {
        const match = String(message).match(/(\d+)\s+seconds/);
        if (match) setCooldown(Number(match[1]));
      }
    } finally {
      setSending(false);
    }
  }, [activeEmail, cooldown, isCompany]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (loading || autoSentRef.current || !activeEmail || error) return;
    const verified = isCompany ? status?.is_email_verified : status?.is_fully_verified;
    if (verified || status?.is_expired) return;
    autoSentRef.current = true;
    handleSend(true);
  }, [loading, activeEmail, status, error, isCompany, handleSend]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const res = isCompany
        ? await confirmCompanyVerificationOTP(activeEmail, otp)
        : await confirmVerificationOTP(activeEmail, otp);
      setStatus(res.data);
      setOtp("");
      const verified = isCompany ? res.data.is_email_verified : res.data.is_fully_verified;
      if (verified) {
        navigate(loginPath, {
          replace: true,
          state: {
            message: isCompany
              ? "Email verified! Log in once admin approves your account."
              : "All set! Log in with your college email and password.",
          },
        });
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Invalid verification code.");
      setError(message);
      showToast(message, "error");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="section" style={{ paddingTop: 80 }}>
          <div className="container" style={{ maxWidth: 480 }}>
            <LoadingSkeleton rows={4} />
          </div>
        </div>
      </div>
    );
  }

  if (status?.is_expired || error?.includes("expired")) {
    return (
      <div className="page-wrapper">
        <div className="section" style={{ paddingTop: 80 }}>
          <div className="container" style={{ maxWidth: 480 }}>
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⏰</div>
              <h1 className="auth-title">Verification expired</h1>
              <p className="auth-subtitle" style={{ marginBottom: 24 }}>
                {error || "Your registration was removed because email verification was not completed in time."}
              </p>
              <Link to={registerPath} className="btn btn-primary btn-full btn-lg">
                Register again
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 80 }}>
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="card" style={{ padding: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✉️</div>
              <h1 className="auth-title">
                {isCompany ? "Verify your company email" : "Verify your college email"}
              </h1>
              <p className="auth-subtitle">{activeEmail}</p>
              {status?.verification_expires_at && (
                <p style={{ color: "var(--gray-500)", fontSize: "0.85rem", marginTop: 8 }}>
                  Complete verification before your registration expires.
                </p>
              )}
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && !error.includes("expired") && <div className="alert alert-error">{error}</div>}

            <button
              type="button"
              className="btn btn-secondary btn-full"
              disabled={sending || cooldown > 0}
              onClick={() => handleSend(false)}
              style={{ marginBottom: 16 }}
            >
              {sending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend verification code"}
            </button>

            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label className="form-label">6-digit code</label>
                <input
                  className="form-input"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  style={{ textAlign: "center", fontSize: "1.4rem", letterSpacing: 8, fontWeight: 700 }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={verifying || otp.length !== 6}>
                {verifying ? "Verifying..." : "Verify & Continue →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 20, color: "var(--gray-500)", fontSize: "0.9rem" }}>
              <Link to={loginPath}>Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
