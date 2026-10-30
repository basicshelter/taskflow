import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWorkspaceDetails,
  getWorkspaceMembersForWorkspaces,
  getWorkspaceMemberships,
  redirectWorkspaceMembers,
} from "@/lib/workspaces";

const { findFirst, findMany, findUnique, findUsers } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findUsers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findFirst,
      findUnique,
    },
    workspaceMembership: { findFirst, findMany },
    user: { findMany: findUsers },
  },
}));

beforeEach(() => {
  findFirst.mockResolvedValue(null);
});

describe("workspace routing", () => {
  it("redirects signed-in members from the root to the workspace list", async () => {
    findFirst.mockResolvedValue({ workspaceId: "workspace-1" });

    await expect(redirectWorkspaceMembers("user-1")).rejects.toThrow(
      "redirect:/workspaces",
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { workspaceId: true },
    });
  });

  it("keeps signed-in users without memberships on the root page", async () => {
    await expect(redirectWorkspaceMembers("user-1")).resolves.toBeUndefined();
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { workspaceId: true },
    });
  });

  it("loads every workspace membership for the signed-in user", async () => {
    findMany.mockResolvedValue([
      { role: "OWNER", workspace: { id: "one", name: "Design" } },
      { role: "MEMBER", workspace: { id: "two", name: "Research" } },
    ]);

    const memberships = await getWorkspaceMemberships("user-1");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        select: {
          role: true,
          workspace: { select: { id: true, name: true } },
        },
      }),
    );
    expect(memberships).toHaveLength(2);
    expect(memberships.map(({ workspace }) => workspace.name)).toEqual([
      "Design",
      "Research",
    ]);
  });

  it("loads workspace details only when the user is a member", async () => {
    findUnique.mockResolvedValue({
      id: "workspace-1",
      name: "Design",
      memberships: [{ role: "OWNER" }],
      projects: [
        {
          id: "project-1",
          name: "Website",
          description: null,
          archivedAt: null,
        },
      ],
    });

    const workspace = await getWorkspaceDetails("workspace-1", "user-1");

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "workspace-1" },
      select: {
        id: true,
        name: true,
        memberships: {
          where: { userId: "user-1" },
          select: { role: true },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            archivedAt: true,
          },
          orderBy: [
            { archivedAt: { sort: "asc", nulls: "first" } },
            { updatedAt: "desc" },
          ],
        },
      },
    });
    expect(workspace?.projects).toHaveLength(1);
  });

  it("loads a workspace member list with names, emails, and roles", async () => {
    findMany.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "OWNER",
        createdAt: new Date("2026-01-01"),
      },
      {
        workspaceId: "workspace-1",
        userId: "user-2",
        role: "ADMIN",
        createdAt: new Date("2026-01-02"),
      },
    ]);
    findUsers.mockResolvedValue([
      { id: "user-1", name: "Alex", email: "alex@example.com" },
      { id: "user-2", name: "Sam", email: "sam@example.com" },
    ]);

    await expect(
      getWorkspaceMembersForWorkspaces(["workspace-1"]),
    ).resolves.toEqual({
      "workspace-1": [
        {
          userId: "user-1",
          name: "Alex",
          email: "alex@example.com",
          role: "OWNER",
        },
        {
          userId: "user-2",
          name: "Sam",
          email: "sam@example.com",
          role: "ADMIN",
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: { in: ["workspace-1"] } },
      }),
    );
    expect(findUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["user-1", "user-2"] } },
      }),
    );
  });

  it("surfaces an inconsistent membership with no user record", async () => {
    findMany.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        userId: "deleted-user",
        role: "MEMBER",
        createdAt: new Date(),
      },
    ]);
    findUsers.mockResolvedValue([]);

    await expect(
      getWorkspaceMembersForWorkspaces(["workspace-1"]),
    ).rejects.toThrow(
      "Workspace member deleted-user has no corresponding user.",
    );
  });

  it("loads member lists for multiple workspaces in one batch", async () => {
    findMany.mockResolvedValue([
      {
        workspaceId: "workspace-1",
        userId: "user-1",
        role: "OWNER",
        createdAt: new Date("2026-01-01"),
      },
      {
        workspaceId: "workspace-2",
        userId: "user-2",
        role: "ADMIN",
        createdAt: new Date("2026-01-02"),
      },
    ]);
    findUsers.mockResolvedValue([
      { id: "user-1", name: "Alex", email: "alex@example.com" },
      { id: "user-2", name: "Sam", email: "sam@example.com" },
    ]);

    await expect(
      getWorkspaceMembersForWorkspaces(["workspace-1", "workspace-2"]),
    ).resolves.toEqual({
      "workspace-1": [
        {
          userId: "user-1",
          name: "Alex",
          email: "alex@example.com",
          role: "OWNER",
        },
      ],
      "workspace-2": [
        {
          userId: "user-2",
          name: "Sam",
          email: "sam@example.com",
          role: "ADMIN",
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: { in: ["workspace-1", "workspace-2"] } },
      }),
    );
  });

  it("does not query the database when there are no workspaces", async () => {
    await expect(getWorkspaceMembersForWorkspaces([])).resolves.toEqual({});
    expect(findMany).not.toHaveBeenCalled();
    expect(findUsers).not.toHaveBeenCalled();
  });
});
