import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  deleteWorkspace,
  renameWorkspace,
} from "@/lib/controllers/workspace.controller";
import { prisma } from "@/lib/prisma";

async function createWorkspaceGraph() {
  const workspaceId = randomUUID();
  const projectIds = [randomUUID(), randomUUID()];
  const ownerId = `workspace-test-owner-${randomUUID()}`;
  const memberId = `workspace-test-member-${randomUUID()}`;

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: "Workspace before rename",
      ownerId,
      memberships: {
        create: [
          { userId: ownerId, role: "OWNER" },
          { userId: memberId, role: "MEMBER" },
        ],
      },
      projects: {
        create: projectIds.map((id, index) => ({
          id,
          name: `Project ${index + 1}`,
          createdById: ownerId,
          tasks: {
            create:
              index === 0
                ? [
                    { title: "Task one", createdById: ownerId },
                    { title: "Task two", createdById: memberId },
                  ]
                : [{ title: "Task three", createdById: ownerId }],
          },
        })),
      },
    },
  });

  return { workspaceId, projectIds, ownerId };
}

async function cleanWorkspaceGraph(workspaceId: string, projectIds: string[]) {
  await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMembership.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("workspace persistence", () => {
  it("persists a renamed workspace without changing its related data", async () => {
    const graph = await createWorkspaceGraph();

    try {
      await renameWorkspace({
        workspaceId: graph.workspaceId,
        requesterId: graph.ownerId,
        name: "Workspace after rename",
      });

      const workspace = await prisma.workspace.findUnique({
        where: { id: graph.workspaceId },
        select: {
          name: true,
          memberships: { select: { userId: true } },
          projects: {
            select: {
              id: true,
              tasks: { select: { id: true } },
            },
          },
        },
      });

      expect(workspace?.name).toBe("Workspace after rename");
      expect(workspace?.memberships).toHaveLength(2);
      expect(workspace?.projects).toHaveLength(2);
      expect(workspace?.projects.map(({ id }) => id).sort()).toEqual(
        [...graph.projectIds].sort(),
      );
      expect(
        workspace?.projects.reduce(
          (taskCount, project) => taskCount + project.tasks.length,
          0,
        ),
      ).toBe(3);
    } finally {
      await cleanWorkspaceGraph(graph.workspaceId, graph.projectIds);
    }
  });

  it("deletes the workspace and cascades to memberships, projects, and tasks", async () => {
    const graph = await createWorkspaceGraph();

    try {
      await deleteWorkspace({
        workspaceId: graph.workspaceId,
        requesterId: graph.ownerId,
      });

      const [workspaceCount, membershipCount, projectCount, taskCount] =
        await Promise.all([
          prisma.workspace.count({ where: { id: graph.workspaceId } }),
          prisma.workspaceMembership.count({
            where: { workspaceId: graph.workspaceId },
          }),
          prisma.project.count({ where: { workspaceId: graph.workspaceId } }),
          prisma.task.count({
            where: { projectId: { in: graph.projectIds } },
          }),
        ]);

      expect(workspaceCount).toBe(0);
      expect(membershipCount).toBe(0);
      expect(projectCount).toBe(0);
      expect(taskCount).toBe(0);
    } finally {
      await cleanWorkspaceGraph(graph.workspaceId, graph.projectIds);
    }
  });
});
