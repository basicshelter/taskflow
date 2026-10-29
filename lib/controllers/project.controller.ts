import { prisma } from "@/lib/prisma";

type CreateProjectInput = {
  workspaceId: string;
  name: string;
  userId: string;
};

type CreateProjectResult =
  | { kind: "workspace_not_found" }
  | { kind: "permission_denied" }
  | { kind: "created"; id: string };

export async function createProject({
  workspaceId,
  name,
  userId,
}: CreateProjectInput): Promise<CreateProjectResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      memberships: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!workspace) {
    return { kind: "workspace_not_found" };
  }

  const role = workspace.memberships[0]?.role;

  if (role !== "OWNER" && role !== "ADMIN") {
    return { kind: "permission_denied" };
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name,
      createdById: userId,
    },
    select: { id: true },
  });

  return { kind: "created", id: project.id };
}
