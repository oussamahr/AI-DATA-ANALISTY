import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useErrorHandler } from "./useErrorHandler";
import { formatApiError } from "@/lib/api-error";

describe("useErrorHandler", () => {
  it("returns handleError and formatApiError", () => {
    const { result } = renderHook(() => useErrorHandler());
    expect(typeof result.current.handleError).toBe("function");
    expect(typeof result.current.formatApiError).toBe("function");
  });

  it("handleError formats Axios errors into ApiError", () => {
    const { result } = renderHook(() => useErrorHandler());

    const axiosError = new Error("Request failed") as any;
    axiosError.isAxiosError = true;
    axiosError.response = { status: 500, data: { message: "Server error", request_id: "req-1" } };
    axiosError.code = "ERR_BAD_RESPONSE";

    const apiError = result.current.handleError(axiosError);
    expect(apiError.status).toBe(500);
    expect(apiError.requestId).toBe("req-1");
    expect(apiError.userMessage).toBe("Server error. Please try again later.");
  });

  it("handleError handles non-Axios errors gracefully", () => {
    const { result } = renderHook(() => useErrorHandler());
    const apiError = result.current.handleError("random string");
    expect(apiError.userMessage).toBe("An unexpected error occurred. Please try again.");
  });

  it("formatApiError is the same reference as direct import", () => {
    const { result } = renderHook(() => useErrorHandler());
    expect(result.current.formatApiError).toBe(formatApiError);
  });
});
