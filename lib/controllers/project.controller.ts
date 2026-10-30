import type { TaskStatus } from "@/generated/prisma/client";
import { HttpError, HttpErrorMessage } from "@/lib/api";
import { ApplicationErrorKind } from "@/lib/application-errors";
import { prisma } from "@/lib/prisma";

export const ProjectErrorKind = {
  WorkspaceNotFound: ApplicationErrorKind.WorkspaceNotFound,
  PermissionDenied: ApplicationErrorKind.PermissionDenied,
  Created: "created",
  ProjectNotFound: ApplicationErrorKind.ProjectNotFound,
  MembershipRequired: ApplicationErrorKind.MembershipRequired,
  Found: "found",
} as const;

export const ProjectResultKind = ProjectErrorKind;

type CreateProjectInput = {
  workspaceId: string;
  name: string;
  userId: string;
};

type CreateProjectResult =
  | { kind: typeof ProjectErrorKind.WorkspaceNotFound }
  | { kind: typeof ProjectErrorKind.PermissionDenied }
  | { kind: typeof ProjectErrorKind.Created; id: string };

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

type UpdateProjectInput = {
  projectId: string;
  requesterId: string;
  name?: string;
  description?: string | null;
  archive?: true;
};

export async function updateProject({
  projectId,
  requesterId,
  name,
  description,
  archive,
}: UpdateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        archivedAt: true,
        workspace: {
          select: {
            ownerId: true,
            memberships: {
              where: { userId: requesterId },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new HttpError(HttpErrorMessage.ProjectNotFound, 404);
    }

    const role = project.workspace.memberships[0]?.role;
    if (project.workspace.ownerId !== requesterId && role !== "ADMIN") {
      throw new HttpError(
        HttpErrorMessage.ProjectManagementPermissionDenied,
        403,
      );
    }

    if (project.archivedAt) {
      throw new HttpError(HttpErrorMessage.ProjectArchived, 409);
    }

    return tx.project.update({
      where: { id: project.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(archive && { archivedAt: new Date() }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
      },
    });
  });
}

type GetProjectDetailsInput = {
  projectId: string;
  userId: string;
};

type GetProjectDetailsResult =
  | { kind: typeof ProjectErrorKind.ProjectNotFound }
  | { kind: typeof ProjectErrorKind.MembershipRequired }
  | {
      kind: typeof ProjectErrorKind.Found;
      project: {
        id: string;
        name: string;
        description: string | null;
        isArchived: boolean;
        tasks: Array<{
          id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
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
      archivedAt: true,
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
      isArchived: project.archivedAt !== null,
      tasks: project.tasks,
    },
    workspaceId: project.workspaceId,
  };
}
