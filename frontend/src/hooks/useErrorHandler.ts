import { useCallback } from "react";
import { formatApiError, type ApiError } from "@/lib/api";

/**
 * Hook for formatting and handling API errors consistently
 */
export function useErrorHandler() {
  const handleError = useCallback((error: unknown): ApiError => {
    return formatApiError(error);
  }, []);

  return { handleError, formatApiError };
}
