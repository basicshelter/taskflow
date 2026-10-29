import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/workspaces/route";

const { getSession, createWorkspace } = vi.hoisted(() => ({
  getSession: vi.fn(),
  createWorkspace: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { create: createWorkspace },
  },
}));

const signedInSession = {
  user: { id: "user-1", name: "Alex", email: "alex@example.com" },
};

beforeEach(() => {
  getSession.mockResolvedValue(signedInSession);
  createWorkspace.mockReset();
});

function createRequest(body: string) {
  return new Request("http://localhost/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

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
