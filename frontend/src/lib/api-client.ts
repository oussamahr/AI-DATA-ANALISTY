import axios, { AxiosError } from "axios";
import { env } from "@/config/env";

const api = axios.create({
  baseURL: env.apiBaseUrl,
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
            `${env.apiBaseUrl}/auth/refresh`,
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

export default api;
