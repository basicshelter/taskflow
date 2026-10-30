import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectDetails } from "@/lib/controllers/project.controller";

const { findProjectUnique, findMembershipUnique } = vi.hoisted(() => ({
  findProjectUnique: vi.fn(),
  findMembershipUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: findProjectUnique },
    workspaceMembership: { findUnique: findMembershipUnique },
  },
}));

const workspaceId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  findProjectUnique.mockReset();
  findProjectUnique
    .mockResolvedValueOnce({ workspaceId })
    .mockResolvedValueOnce({
      id: projectId,
      workspaceId,
      name: "Website",
      description: null,
      archivedAt: null,
      tasks: [],
    });
  findMembershipUnique.mockReset();
  findMembershipUnique.mockResolvedValue({ userId: "user-1" });
});

describe("getProjectDetails", () => {
  it("does not load project tasks when the user has no workspace membership", async () => {
    findMembershipUnique.mockResolvedValue(null);

    await expect(
      getProjectDetails({ projectId, userId: "user-1" }),
    ).resolves.toEqual({ kind: "membership_required" });

    expect(findProjectUnique).toHaveBeenCalledTimes(1);
  });

  it("returns not found when the project does not exist", async () => {
    findProjectUnique.mockReset().mockResolvedValue(null);

    await expect(
      getProjectDetails({ projectId, userId: "user-1" }),
    ).resolves.toEqual({ kind: "project_not_found" });

    expect(findMembershipUnique).not.toHaveBeenCalled();
  });

  it("loads task data only after confirming workspace membership", async () => {
    await expect(
      getProjectDetails({ projectId, userId: "user-1" }),
    ).resolves.toEqual({
      kind: "found",
      project: {
        id: projectId,
        name: "Website",
        description: null,
        isArchived: false,
        tasks: [],
      },
      workspaceId,
    });

    expect(findMembershipUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: { workspaceId, userId: "user-1" },
      },
      select: { userId: true },
    });
    expect(findProjectUnique).toHaveBeenNthCalledWith(2, {
      where: { id: projectId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        archivedAt: true,
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  });
});
