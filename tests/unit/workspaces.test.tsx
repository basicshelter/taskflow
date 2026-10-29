import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWorkspaceDetails,
  getWorkspaceMemberships,
  redirectWorkspaceMembers,
} from "@/lib/workspaces";

const { findFirst, findMany, findUnique } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
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
      projects: [{ id: "project-1", name: "Website", description: null }],
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
          select: { id: true, name: true, description: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    expect(workspace?.projects).toHaveLength(1);
  });
});
