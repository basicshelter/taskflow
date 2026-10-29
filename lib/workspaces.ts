import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function redirectWorkspaceMembers(userId: string) {
  const membership = await prisma.workspaceMembership.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (membership) {
    redirect("/workspaces");
  }
}

export function getWorkspaceMemberships(userId: string) {
  return prisma.workspaceMembership.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function getWorkspaceDetails(workspaceId: string, userId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { userId },
        select: { role: true },
      },
      projects: {
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function getWorkspaceMembersForWorkspaces(workspaceIds: string[]) {
  if (workspaceIds.length === 0) {
    return {};
  }

  const memberships = await prisma.workspaceMembership.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: {
      workspaceId: true,
      userId: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const userIds = [...new Set(memberships.map(({ userId }) => userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  const memberLists: Record<
    string,
    Array<{
      userId: string;
      name: string;
      email: string;
      role: (typeof memberships)[number]["role"];
    }>
  > = Object.fromEntries(workspaceIds.map((id) => [id, []]));

  for (const membership of memberships) {
    const user = usersById.get(membership.userId);

    if (!user) {
      throw new Error(
        `Workspace member ${membership.userId} has no corresponding user.`,
      );
    }

    memberLists[membership.workspaceId].push({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
    });
  }

  return memberLists;
}
