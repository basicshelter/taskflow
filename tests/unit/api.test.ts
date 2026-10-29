import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApplicationErrorKind,
  HttpError,
  HttpErrorMessage,
  mapApplicationError,
  withApiErrorHandling,
} from "@/lib/api";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API error handling", () => {
  it.each([
    [
      ApplicationErrorKind.WorkspaceNotFound,
      HttpErrorMessage.WorkspaceNotFound,
      404,
    ],
    [
      ApplicationErrorKind.PermissionDenied,
      HttpErrorMessage.ProjectCreationPermissionDenied,
      403,
    ],
    [
      ApplicationErrorKind.ProjectNotFound,
      HttpErrorMessage.ProjectNotFound,
      404,
    ],
    [
      ApplicationErrorKind.MembershipRequired,
      HttpErrorMessage.MembershipRequired,
      403,
    ],
  ])("maps application error %s to an HTTP error", (kind, message, status) => {
    const error = mapApplicationError(kind);

    expect(error).toBeInstanceOf(HttpError);
    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
  });

  it("serializes HTTP errors using a consistent error response", async () => {
    const handler = withApiErrorHandling(async () => {
      throw new HttpError(HttpErrorMessage.AuthenticationRequired, 401);
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: HttpErrorMessage.AuthenticationRequired,
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
