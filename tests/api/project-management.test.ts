import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/v1/projects/[projectId]/route";

const { getSession, updateProject } = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/controllers/project.controller", () => ({
  updateProject,
}));

const projectId = "00000000-0000-4000-8000-000000000002";
const context = { params: Promise.resolve({ projectId }) };

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: "admin-1" } });
  updateProject.mockReset();
  updateProject.mockResolvedValue({
    id: projectId,
    name: "Website",
    description: null,
    archivedAt: null,
  });
});

function createRequest(body: string) {
  return new Request(`http://localhost/api/v1/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("project management endpoint", () => {
  it("validates and updates project details", async () => {
    const response = await PATCH(
      createRequest(
        JSON.stringify({
          name: "  Website  ",
          description: "  Company site  ",
        }),
      ),
      context,
    );

    expect(response.status).toBe(200);
    expect(updateProject).toHaveBeenCalledWith({
      projectId,
      requesterId: "admin-1",
      name: "Website",
      description: "Company site",
    });
  });

  it("allows clearing the project description", async () => {
    await PATCH(createRequest(JSON.stringify({ description: null })), context);

    expect(updateProject).toHaveBeenCalledWith({
      projectId,
      requesterId: "admin-1",
      description: null,
    });
  });

  it("accepts archive actions", async () => {
    await PATCH(createRequest(JSON.stringify({ archive: true })), context);

    expect(updateProject).toHaveBeenCalledWith({
      projectId,
      requesterId: "admin-1",
      archive: true,
    });
  });

  it("rejects empty or invalid project updates", async () => {
    const response = await PATCH(createRequest(JSON.stringify({})), context);

    expect(response.status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("requires authentication and valid project IDs", async () => {
    getSession.mockResolvedValue(null);

    const unauthenticated = await PATCH(
      createRequest(JSON.stringify({ archive: true })),
      context,
    );
    expect(unauthenticated.status).toBe(401);
    expect(updateProject).not.toHaveBeenCalled();

    getSession.mockResolvedValue({ user: { id: "admin-1" } });
    const invalidId = await PATCH(
      new Request("http://localhost/api/v1/projects/invalid", {
        method: "PATCH",
        body: JSON.stringify({ archive: true }),
      }),
      { params: Promise.resolve({ projectId: "invalid" }) },
    );
    expect(invalidId.status).toBe(404);
    expect(updateProject).not.toHaveBeenCalled();
  });
});
