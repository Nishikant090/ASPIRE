/**
 * Parse FastAPI error responses into user-friendly messages.
 */

export function parseApiDetail(detail) {
  if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
    return detail;
  }
  return { message: formatDetailValue(detail) };
}

function formatDetailValue(detail) {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail === "object" && detail.message) {
    return detail.message;
  }
  return null;
}

export function getApiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (detail === undefined || detail === null) {
    if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
    if (status === 500) return "Server error. Please try again later.";
    if (!error?.response) return "Unable to reach the server. Check your connection.";
    return fallback;
  }

  const parsed = parseApiDetail(detail);
  const message = parsed.message || formatDetailValue(detail);

  if (message) return message;

  if (status === 401) return "Incorrect email or password.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "Account not found. Please check your email or register first.";
  if (status === 409) return "Email already registered. Please log in.";

  return fallback;
}
