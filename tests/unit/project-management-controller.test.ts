import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProject } from "@/lib/controllers/project.controller";

const { transaction, findProject, updateProjectRecord } = vi.hoisted(() => ({
  transaction: vi.fn(),
  findProject: vi.fn(),
  updateProjectRecord: vi.fn(),
}));

const tx = {
  project: {
    findUnique: findProject,
    update: updateProjectRecord,
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction },
}));

const projectId = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((operation) => operation(tx));
  findProject.mockResolvedValue({
    id: projectId,
    archivedAt: null,
    workspace: {
      ownerId: "owner-1",
      memberships: [{ role: "ADMIN" }],
    },
  });
  updateProjectRecord.mockResolvedValue({
    id: projectId,
    name: "Website",
    description: "Company site",
    archivedAt: null,
  });
});

describe("project management", () => {
  it("allows admins to edit project metadata", async () => {
    await updateProject({
      projectId,
      requesterId: "admin-1",
      name: "Website",
      description: "Company site",
    });

    expect(updateProjectRecord).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { name: "Website", description: "Company site" },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
      },
    });
  });

  it("allows owners to archive projects", async () => {
    findProject.mockResolvedValue({
      id: projectId,
      archivedAt: null,
      workspace: { ownerId: "owner-1", memberships: [] },
    });

    await updateProject({
      projectId,
      requesterId: "owner-1",
      archive: true,
    });

    expect(updateProjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { archivedAt: expect.any(Date) },
      }),
    );
  });

  it("denies project changes to regular members", async () => {
    findProject.mockResolvedValue({
      id: projectId,
      archivedAt: null,
      workspace: { ownerId: "owner-1", memberships: [{ role: "MEMBER" }] },
    });

    await expect(
      updateProject({
        projectId,
        requesterId: "member-1",
        name: "Website",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(updateProjectRecord).not.toHaveBeenCalled();
  });

  it("prevents changes to archived projects", async () => {
    findProject.mockResolvedValue({
      id: projectId,
      archivedAt: new Date("2026-01-01"),
      workspace: { ownerId: "owner-1", memberships: [{ role: "ADMIN" }] },
    });

    await expect(
      updateProject({
        projectId,
        requesterId: "admin-1",
        name: "Website",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(updateProjectRecord).not.toHaveBeenCalled();
  });

  it("returns not found for missing projects", async () => {
    findProject.mockResolvedValue(null);

    await expect(
      updateProject({
        projectId,
        requesterId: "admin-1",
        archive: true,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(updateProjectRecord).not.toHaveBeenCalled();
  });
});
