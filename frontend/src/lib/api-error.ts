import axios from "axios";

export interface ApiError {
  requestId?: string;
  message: string;
  code?: string;
  userMessage: string;
  status?: number;
}

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
