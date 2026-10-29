import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, withApiErrorHandling } from "@/lib/api";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API error handling", () => {
  it("serializes HTTP errors using a consistent error response", async () => {
    const handler = withApiErrorHandling(async () => {
      throw new HttpError("Authentication required.", 401);
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required.",
    });
  });

  it("logs unexpected errors and returns a generic server error", async () => {
    const error = new Error("database credentials must not be exposed");
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw error;
    });

    const response = await handler();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error." });
    expect(logError).toHaveBeenCalledWith("Unhandled API error:", error);
  });
});
