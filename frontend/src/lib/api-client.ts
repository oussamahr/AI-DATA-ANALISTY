import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// CSRF: backend sets cookie ai_data_csrf (httpOnly=false) when session cookie enabled.
// We must read it and send as X-CSRF-Token header for unsafe methods.
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ai_data_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // critical: send httpOnly cookies
});

// Request interceptor: inject CSRF header for unsafe methods
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || "get").toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (unsafe) {
    const csrf = getCsrfTokenFromCookie();
    if (csrf) {
      config.headers.set("X-CSRF-Token", csrf);
    }
  }
  // Ensure no token in localStorage is leaked as header
  return config;
});

// Refresh token queue to avoid single-flight storm
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try refresh unless it's an auth endpoint
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") ||
                           originalRequest?.url?.includes("/auth/register") ||
                           originalRequest?.url?.includes("/auth/refresh") ||
                           originalRequest?.url?.includes("/auth/oidc");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue this request until refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh uses httpOnly refresh_token cookie, no body needed per backend
        await apiClient.post("/auth/refresh", {}, { _retry: true } as never);
        processQueue(null, null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear any state and redirect to login only if not already there
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          // Avoid infinite loop: only redirect if not on auth pages
          const authPaths = ["/login", "/register", "/forgot", "/reset-password", "/verify-email"];
          const isOnAuthPage = authPaths.some((p) => window.location.pathname.includes(p));
          if (!isOnAuthPage) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
