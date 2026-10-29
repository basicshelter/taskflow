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
