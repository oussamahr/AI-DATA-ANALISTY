import axios, { AxiosError } from "axios";

const API_BASE = "/api/v1";

export interface ApiError {
  requestId?: string;
  message: string;
  code?: string;
  userMessage: string;
  status?: number;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Include httpOnly cookies in requests
});

let refreshPromise: Promise<void> | null = null;

api.interceptors.request.use((config) => {
  // CSRF token from cookie (if present)
  const csrf = document.cookie
    .split("; ")
    .find((c) => c.startsWith("ai_data_csrf="))
    ?.split("=")[1];
  if (csrf) {
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized — attempt token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${API_BASE}/auth/refresh`,
            {}, // Empty body; refresh token is in httpOnly cookie (auto-included via withCredentials)
            { withCredentials: true }
          )
          .then(() => {})
          .catch(() => {
            // Refresh failed — clear session and redirect to login
            window.location.href = "/login";
            throw new Error("Session expired. Please log in again.");
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        // Retry original request with new tokens (in cookies)
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Extract and format API error into user-friendly message
 */
export function formatApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      message: String(error),
      userMessage: "An unexpected error occurred. Please try again.",
      code: "UNKNOWN_ERROR",
    };
  }

  const status = error.response?.status;
  const data = error.response?.data as any;
  const requestId = data?.request_id || "unknown";

  // Map HTTP status to user-friendly message
  let userMessage = "An error occurred. Please try again.";

  if (status === 400) {
    userMessage = data?.message || "Invalid input. Please check your data.";
  } else if (status === 401) {
    userMessage = "Your session has expired. Please log in again.";
  } else if (status === 403) {
    userMessage = "You don't have permission to perform this action.";
  } else if (status === 404) {
    userMessage = "The requested resource was not found.";
  } else if (status === 422) {
    const field = data?.field || data?.loc?.join(".") || "unknown field";
    userMessage = `Invalid ${field}: ${data?.message || "please check your input"}`;
  } else if (status === 429) {
    userMessage = "Too many requests. Please wait a moment and try again.";
  } else if (status === 500 || status === 502 || status === 503) {
    userMessage = "Server error. Please try again later.";
  }

  return {
    requestId,
    message: data?.message || error.message,
    userMessage,
    code: data?.error_code || `HTTP_${status}`,
    status,
  };
}

export default api;
