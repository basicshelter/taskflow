import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailsPage from "@/app/(app)/projects/[projectId]/page";

const { verifySession, getProjectDetails } = vi.hoisted(() => ({
  verifySession: vi.fn(),
  getProjectDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("forbidden");
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/lib/auth-session", () => ({
  verifySession,
}));

vi.mock("@/lib/controllers/project.controller", () => ({
  ProjectErrorKind: {
    ProjectNotFound: "project_not_found",
    MembershipRequired: "membership_required",
  },
  getProjectDetails,
}));

const projectId = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  verifySession.mockResolvedValue({
    user: { id: "user-1", name: "Alex", email: "alex@example.com" },
  });
  getProjectDetails.mockResolvedValue({
    kind: "found",
    project: {
      id: projectId,
      name: "Website",
      description: "Redesign the company website.",
      isArchived: false,
      tasks: [
        { id: "task-1", title: "Write copy", status: "TODO" },
        { id: "task-2", title: "Build layout", status: "IN_PROGRESS" },
        { id: "task-3", title: "Review design", status: "IN_REVIEW" },
        { id: "task-4", title: "Publish site", status: "DONE" },
      ],
    },
  });
});

describe("project details access", () => {
  it("denies project access to users without workspace membership", async () => {
    getProjectDetails.mockResolvedValue({ kind: "membership_required" });

    await expect(
      ProjectDetailsPage({
        params: Promise.resolve({ projectId }),
      }),
    ).rejects.toThrow("forbidden");
  });

  it("rejects malformed IDs without loading project details", async () => {
    await expect(
      ProjectDetailsPage({
        params: Promise.resolve({ projectId: "invalid" }),
      }),
    ).rejects.toThrow("notFound");

    expect(getProjectDetails).not.toHaveBeenCalled();
  });
});
