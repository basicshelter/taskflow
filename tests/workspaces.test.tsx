import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/workspaces/route";
import {
  getWorkspaceDetails,
  getWorkspaceMemberships,
  redirectWorkspaceMembers,
} from "@/lib/workspaces";

const { getSession, findFirst, findMany, findUnique, createWorkspace } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    createWorkspace: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findFirst,
      findUnique,
      create: createWorkspace,
    },
    workspaceMembership: { findFirst, findMany },
  },
}));

const signedInSession = {
  user: { id: "user-1", name: "Alex", email: "alex@example.com" },
};

beforeEach(() => {
  getSession.mockResolvedValue(signedInSession);
  findFirst.mockResolvedValue(null);
});

function createRequest(body: string) {
  return new Request("http://localhost/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

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

describe("workspace creation endpoint", () => {
  it("requires authentication", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST(
      createRequest(JSON.stringify({ name: "Team" })),
    );

    expect(response.status).toBe(401);
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("rejects workspace names outside the supported length", async () => {
    const response = await POST(createRequest(JSON.stringify({ name: "x" })));

    expect(response.status).toBe(400);
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("creates the workspace and owner membership together", async () => {
    createWorkspace.mockResolvedValue({ id: "workspace-1" });

    const response = await POST(
      createRequest(JSON.stringify({ name: "  Team North  " })),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "workspace-1" });
    expect(createWorkspace).toHaveBeenCalledWith({
      data: {
        name: "Team North",
        ownerId: "user-1",
        memberships: {
          create: {
            userId: "user-1",
            role: "OWNER",
          },
        },
      },
      select: { id: true },
    });
  });
});
