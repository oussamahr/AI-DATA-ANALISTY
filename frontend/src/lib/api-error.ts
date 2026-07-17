import axios from "axios";

export interface ApiErrorDetail {
  userMessage: string;
  detail: string;
  status?: number;
  code?: string;
}

export function formatApiError(err: unknown): ApiErrorDetail {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as Record<string, unknown> | undefined;
    
    // Backend returns { detail: string } or { detail: [{msg}] } or message
    let detail: string = "An unexpected error occurred";
    if (data) {
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data.detail)) {
        // Pydantic validation errors
        const first = data.detail[0] as { msg?: string; loc?: string[] } | undefined;
        detail = first?.msg || JSON.stringify(data.detail);
      } else if (typeof data.message === "string") {
        detail = data.message as string;
      } else if (typeof data.error === "string") {
        detail = data.error as string;
      }
    } else if (err.message) {
      detail = err.message;
    }

    // Map common statuses to user-friendly messages
    let userMessage = detail;
    switch (status) {
      case 400:
        userMessage = detail || "Invalid request. Please check your input.";
        break;
      case 401:
        userMessage = "Session expired. Please sign in again.";
        break;
      case 403:
        userMessage = "You don't have permission to perform this action.";
        break;
      case 404:
        userMessage = detail || "Resource not found.";
        break;
      case 413:
        userMessage = "File too large. Please reduce size and try again.";
        break;
      case 422:
        userMessage = detail || "Validation error. Please check your input.";
        break;
      case 429:
        userMessage = "Too many requests. Please wait a moment and try again.";
        break;
      case 500:
      case 502:
      case 503:
        userMessage = "Server error. Please try again later.";
        break;
      default:
        userMessage = detail;
    }

    return {
      userMessage,
      detail,
      status,
    };
  }

  if (err instanceof Error) {
    return {
      userMessage: err.message,
      detail: err.message,
    };
  }

  return {
    userMessage: "An unexpected error occurred",
    detail: "Unknown error",
  };
}

// Password policy validation mirroring backend: min 8, upper, lower, digit, special
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one digit";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
}

// Sanitize user input display to prevent XSS (defense in depth, React already escapes but extra safety for innerHTML avoidance)
export function sanitizeDisplayText(text: string): string {
  return text.replace(/[<>]/g, "");
}
