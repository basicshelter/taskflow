import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkspaceDetailsPage from "@/app/(app)/workspaces/[workspaceId]/page";

const { verifySession, getWorkspaceDetails } = vi.hoisted(() => ({
  verifySession: vi.fn(),
  getWorkspaceDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("forbidden");
  },
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/lib/auth-session", () => ({
  verifySession,
}));

vi.mock("@/lib/workspaces", () => ({
  getWorkspaceDetails,
}));

beforeEach(() => {
  verifySession.mockResolvedValue({
    user: { id: "user-1", name: "Alex", email: "alex@example.com" },
  });
  getWorkspaceDetails.mockResolvedValue(null);
});

describe("workspace details access", () => {
  it("returns a forbidden response for an authenticated non-member", async () => {
    getWorkspaceDetails.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Design",
      memberships: [],
      projects: [],
    });

    await expect(
      WorkspaceDetailsPage({
        params: Promise.resolve({
          workspaceId: "00000000-0000-4000-8000-000000000001",
        }),
      }),
    ).rejects.toThrow("forbidden");

    expect(getWorkspaceDetails).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "user-1",
    );
  });

  it("rejects malformed workspace IDs without querying the database", async () => {
    await expect(
      WorkspaceDetailsPage({
        params: Promise.resolve({ workspaceId: "not-a-uuid" }),
      }),
    ).rejects.toThrow("notFound");

    expect(getWorkspaceDetails).not.toHaveBeenCalled();
  });

  it("returns not found when the workspace does not exist", async () => {
    await expect(
      WorkspaceDetailsPage({
        params: Promise.resolve({
          workspaceId: "00000000-0000-4000-8000-000000000001",
        }),
      }),
    ).rejects.toThrow("notFound");
  });
});
