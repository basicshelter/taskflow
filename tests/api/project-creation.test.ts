import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/workspaces/[workspaceId]/projects/route";
import { HttpErrorMessage } from "@/lib/api";

const { getSession, findUnique, createProject } = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  createProject: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique },
    project: { create: createProject },
  },
}));

const workspaceId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  getSession.mockResolvedValue({
    user: { id: "user-1" },
  });
  findUnique.mockResolvedValue({
    id: workspaceId,
    memberships: [{ role: "OWNER" }],
  });
  createProject.mockResolvedValue({ id: "project-1" });
});

function createRequest(body: string) {
  return new Request(
    `http://localhost/api/v1/workspaces/${workspaceId}/projects`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}

function createProjectRequest() {
  return POST(createRequest(JSON.stringify({ name: "  Website  " })), {
    params: Promise.resolve({ workspaceId }),
  });
}

describe("project creation endpoint", () => {
  it("allows workspace owners to create projects", async () => {
    const response = await createProjectRequest();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "project-1" });
    expect(createProject).toHaveBeenCalledWith({
      data: {
        workspaceId,
        name: "Website",
        createdById: "user-1",
      },
      select: { id: true },
    });
  });

  it("allows workspace admins to create projects", async () => {
    findUnique.mockResolvedValue({
      id: workspaceId,
      memberships: [{ role: "ADMIN" }],
    });

    const response = await createProjectRequest();

    expect(response.status).toBe(201);
  });

  it("rejects workspace members from creating projects", async () => {
    findUnique.mockResolvedValue({
      id: workspaceId,
      memberships: [{ role: "MEMBER" }],
    });

    const response = await createProjectRequest();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: HttpErrorMessage.ProjectCreationPermissionDenied,
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("rejects users who are not workspace members", async () => {
    findUnique.mockResolvedValue({ id: workspaceId, memberships: [] });

    const response = await createProjectRequest();

    expect(response.status).toBe(403);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("returns not found for a workspace that does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const response = await createProjectRequest();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: HttpErrorMessage.WorkspaceNotFound,
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("returns not found for malformed workspace IDs", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/workspaces/bad-id/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Website" }),
      }),
      { params: Promise.resolve({ workspaceId: "bad-id" }) },
    );

    expect(response.status).toBe(404);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    getSession.mockResolvedValue(null);

    const response = await createProjectRequest();

    expect(response.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
