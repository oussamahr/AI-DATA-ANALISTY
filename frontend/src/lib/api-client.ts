import axios from "axios";

// Creates a centralized axios instance configured for our API
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Necessary if the backend uses HttpOnly cookies for session/CSRF
});

// Optionally add interceptors for global error handling or auth
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We could dispatch a toast notification or redirect to /login here if 401
    return Promise.reject(error);
  }
);
