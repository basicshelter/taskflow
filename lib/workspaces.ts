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
