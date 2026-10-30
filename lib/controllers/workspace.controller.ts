import type { Prisma } from "@/generated/prisma/client";
import { HttpError, HttpErrorMessage } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type CreateWorkspaceInput = {
  name: string;
  userId: string;
};

export async function createWorkspace({ name, userId }: CreateWorkspaceInput) {
  return prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
      memberships: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
    select: { id: true },
  });
}

type ManageWorkspaceInput = {
  workspaceId: string;
  requesterId: string;
};

async function requireWorkspaceManager(
  tx: Prisma.TransactionClient,
  { workspaceId, requesterId }: ManageWorkspaceInput,
) {
  const workspace = await tx.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      ownerId: true,
      memberships: {
        where: { userId: requesterId },
        select: { role: true },
      },
    },
  });

  if (!workspace) {
    throw new HttpError(HttpErrorMessage.WorkspaceNotFound, 404);
  }

  if (
    workspace.ownerId !== requesterId &&
    workspace.memberships[0]?.role !== "ADMIN"
  ) {
    throw new HttpError(HttpErrorMessage.WorkspacePermissionDenied, 403);
  }

  return workspace;
}

async function requireWorkspaceOwner(
  tx: Prisma.TransactionClient,
  { workspaceId, requesterId }: ManageWorkspaceInput,
) {
  const workspace = await tx.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, ownerId: true },
  });

  if (!workspace) {
    throw new HttpError(HttpErrorMessage.WorkspaceNotFound, 404);
  }

  if (workspace.ownerId !== requesterId) {
    throw new HttpError(HttpErrorMessage.WorkspaceOwnerRequired, 403);
  }

  return workspace;
}

export async function renameWorkspace({
  workspaceId,
  requesterId,
  name,
}: ManageWorkspaceInput & { name: string }) {
  return prisma.$transaction(async (tx) => {
    const workspace = await requireWorkspaceManager(tx, {
      workspaceId,
      requesterId,
    });

    return tx.workspace.update({
      where: { id: workspace.id },
      data: { name },
      select: { id: true, name: true },
    });
  });
}

export async function deleteWorkspace({
  workspaceId,
  requesterId,
}: ManageWorkspaceInput) {
  return prisma.$transaction(async (tx) => {
    const workspace = await requireWorkspaceOwner(tx, {
      workspaceId,
      requesterId,
    });

    await tx.workspace.delete({ where: { id: workspace.id } });
  });
}

export async function inviteWorkspaceMember({
  workspaceId,
  requesterId,
  email,
}: ManageWorkspaceInput & { email: string }) {
  return prisma.$transaction(async (tx) => {
    await requireWorkspaceManager(tx, { workspaceId, requesterId });

    const user = await tx.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (!user) {
      throw new HttpError("No registered user has that email address.", 404);
    }

    const existingMembership = await tx.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      select: { userId: true },
    });

    if (existingMembership) {
      throw new HttpError("That user is already a workspace member.", 409);
    }

    return tx.workspaceMembership.create({
      data: {
        workspaceId,
        userId: user.id,
        role: "MEMBER",
      },
      select: { userId: true, role: true },
    });
  });
}

export async function updateWorkspaceMemberRole({
  workspaceId,
  requesterId,
  memberId,
  role,
}: ManageWorkspaceInput & {
  memberId: string;
  role: "ADMIN" | "MEMBER";
}) {
  return prisma.$transaction(async (tx) => {
    const workspace = await requireWorkspaceManager(tx, {
      workspaceId,
      requesterId,
    });
    const membership = await tx.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
      select: { userId: true, role: true },
    });

    if (!membership) {
      throw new HttpError(HttpErrorMessage.WorkspaceMemberMissing, 404);
    }

    if (
      membership.userId === workspace.ownerId ||
      membership.role === "OWNER"
    ) {
      throw new HttpError("The workspace owner's role cannot be changed.", 403);
    }

    return tx.workspaceMembership.update({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
      data: { role },
      select: { userId: true, role: true },
    });
  });
}

export async function removeWorkspaceMember({
  workspaceId,
  requesterId,
  memberId,
}: ManageWorkspaceInput & { memberId: string }) {
  return prisma.$transaction(async (tx) => {
    const workspace = await requireWorkspaceManager(tx, {
      workspaceId,
      requesterId,
    });
    const membership = await tx.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
      select: { userId: true, role: true },
    });

    if (!membership) {
      throw new HttpError(HttpErrorMessage.WorkspaceMemberMissing, 404);
    }

    if (
      membership.userId === workspace.ownerId ||
      membership.role === "OWNER"
    ) {
      throw new HttpError("The workspace owner cannot be removed.", 403);
    }

    await tx.workspaceMembership.delete({
      where: {
        workspaceId_userId: { workspaceId, userId: memberId },
      },
    });
  });
}

export async function transferWorkspaceOwnership({
  workspaceId,
  requesterId,
  newOwnerId,
}: ManageWorkspaceInput & { newOwnerId: string }) {
  return prisma.$transaction(async (tx) => {
    const workspace = await requireWorkspaceOwner(tx, {
      workspaceId,
      requesterId,
    });

    if (newOwnerId === requesterId) {
      throw new HttpError("You already own this workspace.", 400);
    }

    const newOwnerMembership = await tx.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: newOwnerId,
        },
      },
      select: { userId: true },
    });

    if (!newOwnerMembership) {
      throw new HttpError(
        "Ownership can only be transferred to a workspace member.",
        404,
      );
    }

    await tx.workspaceMembership.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: requesterId,
        },
      },
      data: { role: "ADMIN" },
    });
    await tx.workspaceMembership.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: newOwnerId,
        },
      },
      data: { role: "OWNER" },
    });
    await tx.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: newOwnerId },
    });
  });
}
