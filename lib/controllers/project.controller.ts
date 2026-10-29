import { prisma } from "@/lib/prisma";

export enum ProjectErrorKind {
  WorkspaceNotFound = "workspace_not_found",
  PermissionDenied = "permission_denied",
  Created = "created",
  ProjectNotFound = "project_not_found",
  MembershipRequired = "membership_required",
  Found = "found",
}

export const ProjectResultKind = ProjectErrorKind;

type CreateProjectInput = {
  workspaceId: string;
  name: string;
  userId: string;
};

type CreateProjectResult =
  | { kind: ProjectErrorKind.WorkspaceNotFound }
  | { kind: ProjectErrorKind.PermissionDenied }
  | { kind: ProjectErrorKind.Created; id: string };

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
    return { kind: ProjectErrorKind.WorkspaceNotFound };
  }

  const role = workspace.memberships[0]?.role;

  if (role !== "OWNER" && role !== "ADMIN") {
    return { kind: ProjectErrorKind.PermissionDenied };
  }

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name,
      createdById: userId,
    },
    select: { id: true },
  });

  return { kind: ProjectErrorKind.Created, id: project.id };
}

type GetProjectDetailsInput = {
  projectId: string;
  userId: string;
};

type GetProjectDetailsResult =
  | { kind: ProjectErrorKind.ProjectNotFound }
  | { kind: ProjectErrorKind.MembershipRequired }
  | {
      kind: ProjectErrorKind.Found;
      project: {
        id: string;
        name: string;
        description: string | null;
        tasks: Array<{
          id: string;
          title: string;
          description: string | null;
          status: string;
        }>;
      };
      workspaceId: string;
    };

export async function getProjectDetails({
  projectId,
  userId,
}: GetProjectDetailsInput): Promise<GetProjectDetailsResult> {
  const projectReference = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!projectReference) {
    return { kind: ProjectErrorKind.ProjectNotFound };
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: projectReference.workspaceId,
        userId,
      },
    },
    select: { userId: true },
  });

  if (!membership) {
    return { kind: ProjectErrorKind.MembershipRequired };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      description: true,
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) {
    return { kind: ProjectErrorKind.ProjectNotFound };
  }

  return {
    kind: ProjectErrorKind.Found,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      tasks: project.tasks,
    },
    workspaceId: project.workspaceId,
  };
}
