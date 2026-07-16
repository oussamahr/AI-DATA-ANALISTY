/**
 * Typed access to environment variables.
 * Single place that knows about import.meta.env.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1",
} as const;
