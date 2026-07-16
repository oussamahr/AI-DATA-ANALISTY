import { describe, it, expect } from "vitest";
import { formatApiError } from "./api-error";
import type { AxiosError } from "axios";

function makeAxiosError(status: number, data?: unknown, message = "Request failed"): AxiosError {
  const error = new Error(message) as AxiosError;
  error.response = {
    status,
    data,
    statusText: "",
    headers: {},
    config: {} as any,
  };
  error.isAxiosError = true;
  error.code = "ERR_BAD_RESPONSE";
  return error;
}

describe("formatApiError", () => {
  it("returns user message for unknown (non-Axios) errors", () => {
    const result = formatApiError(new Error("something broke"));
    expect(result.userMessage).toBe("An unexpected error occurred. Please try again.");
    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("returns user message for non-Error thrown values", () => {
    const result = formatApiError("string error");
    expect(result.userMessage).toBe("An unexpected error occurred. Please try again.");
    expect(result.code).toBe("UNKNOWN_ERROR");
  });

  it("maps 400 to invalid input message", () => {
    const error = makeAxiosError(400, { message: "Name is required" });
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Name is required");
    expect(result.status).toBe(400);
  });

  it("uses default 400 message when backend sends none", () => {
    const error = makeAxiosError(400);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Invalid input. Please check your data.");
  });

  it("maps 401 to session expired", () => {
    const error = makeAxiosError(401);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Your session has expired. Please log in again.");
  });

  it("maps 403 to permission denied", () => {
    const error = makeAxiosError(403);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("You don't have permission to perform this action.");
  });

  it("maps 404 to not found", () => {
    const error = makeAxiosError(404);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("The requested resource was not found.");
  });

  it("maps 422 to field-specific error", () => {
    const error = makeAxiosError(422, { message: "Invalid format", field: "email" });
    const result = formatApiError(error);
    expect(result.userMessage).toContain("email");
    expect(result.userMessage).toContain("Invalid format");
  });

  it("maps 422 with loc array to field path", () => {
    const error = makeAxiosError(422, { message: "required", loc: ["body", "prompt"] });
    const result = formatApiError(error);
    expect(result.userMessage).toContain("body.prompt");
  });

  it("maps 429 to rate limit", () => {
    const error = makeAxiosError(429);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Too many requests. Please wait a moment and try again.");
  });

  it("maps 500 to server error", () => {
    const error = makeAxiosError(500);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Server error. Please try again later.");
  });

  it("maps 502 to server error", () => {
    const error = makeAxiosError(502);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Server error. Please try again later.");
  });

  it("maps 503 to server error", () => {
    const error = makeAxiosError(503);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("Server error. Please try again later.");
  });

  it("extracts request_id from response data", () => {
    const error = makeAxiosError(500, { request_id: "abc-123", message: "Internal error" });
    const result = formatApiError(error);
    expect(result.requestId).toBe("abc-123");
  });

  it("defaults request_id to 'unknown' when not provided", () => {
    const error = makeAxiosError(500, { message: "oops" });
    const result = formatApiError(error);
    expect(result.requestId).toBe("unknown");
  });

  it("preserves raw error message", () => {
    const error = makeAxiosError(400, { message: "bad data" });
    const result = formatApiError(error);
    expect(result.message).toBe("bad data");
  });

  it("falls back to Axios error message when backend has none", () => {
    const error = makeAxiosError(500);
    const result = formatApiError(error);
    expect(result.message).toBe("Request failed");
  });

  it("returns generic message for unmapped status codes", () => {
    const error = makeAxiosError(418);
    const result = formatApiError(error);
    expect(result.userMessage).toBe("An error occurred. Please try again.");
    expect(result.status).toBe(418);
  });

  it("sets error_code from backend response", () => {
    const error = makeAxiosError(400, { error_code: "VALIDATION_ERROR" });
    const result = formatApiError(error);
    expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("falls back to HTTP_XXX code when backend has none", () => {
    const error = makeAxiosError(422);
    const result = formatApiError(error);
    expect(result.code).toBe("HTTP_422");
  });
});
