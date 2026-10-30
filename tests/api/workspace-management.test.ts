import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/v1/workspaces/[workspaceId]/route";

const { getSession, deleteWorkspace, renameWorkspace } = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteWorkspace: vi.fn(),
  renameWorkspace: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/controllers/workspace.controller", () => ({
  deleteWorkspace,
  renameWorkspace,
}));

const workspaceId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  getSession.mockResolvedValue({ user: { id: "admin-1" } });
  deleteWorkspace.mockReset();
  renameWorkspace.mockReset();
});

function createRequest(method: string, body?: string) {
  return new Request(`http://localhost/api/v1/workspaces/${workspaceId}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body }),
  });
}

const context = { params: Promise.resolve({ workspaceId }) };

describe("workspace management endpoints", () => {
  it("validates and renames a workspace", async () => {
    renameWorkspace.mockResolvedValue({ id: workspaceId, name: "Team North" });

    const response = await PATCH(
      createRequest("PATCH", JSON.stringify({ name: "  Team North  " })),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: workspaceId,
      name: "Team North",
    });
    expect(renameWorkspace).toHaveBeenCalledWith({
      workspaceId,
      requesterId: "admin-1",
      name: "Team North",
    });
  });

  it("rejects invalid workspace names", async () => {
    const response = await PATCH(
      createRequest("PATCH", JSON.stringify({ name: "x" })),
      context,
    );

    expect(response.status).toBe(400);
    expect(renameWorkspace).not.toHaveBeenCalled();
  });

  it("deletes a workspace and returns no content", async () => {
    const response = await DELETE(createRequest("DELETE"), context);

    expect(response.status).toBe(204);
    expect(deleteWorkspace).toHaveBeenCalledWith({
      workspaceId,
      requesterId: "admin-1",
    });
  });

  it("requires authentication before changing a workspace", async () => {
    getSession.mockResolvedValue(null);

    const response = await DELETE(createRequest("DELETE"), context);

    expect(response.status).toBe(401);
    expect(deleteWorkspace).not.toHaveBeenCalled();
  });

  it("rejects malformed workspace IDs", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/v1/workspaces/bad-id", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ workspaceId: "bad-id" }) },
    );

    expect(response.status).toBe(404);
    expect(deleteWorkspace).not.toHaveBeenCalled();
  });
});
