import { randomInt } from "node:crypto";
import {
  PrismaClient,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const users = [
  {
    key: "ownerAb",
    id: "seed_owner_ab",
    name: "Workspace Owner AB",
    email: "owner+ab@taskflow.com",
    password: "ownerabpassword",
  },
  {
    key: "ownerC",
    id: "seed_owner_c",
    name: "Workspace Owner C",
    email: "owner+c@taskflow.com",
    password: "ownercpassword",
  },
  {
    key: "ownerD",
    id: "seed_owner_d",
    name: "Workspace Owner D",
    email: "owner+d@taskflow.com",
    password: "ownerdpassword",
  },
  {
    key: "member",
    id: "seed_member",
    name: "Workspace Member",
    email: "member@taskflow.com",
    password: "memberpassword",
  },
  {
    key: "admin",
    id: "seed_admin",
    name: "Workspace Admin",
    email: "admin@taskflow.com",
    password: "adminpassword",
  },
] as const;

type UserKey = (typeof users)[number]["key"];
type WorkspaceKey = "A" | "B" | "C" | "D";

const workspaces: Record<WorkspaceKey, { id: string; projectCount: number }> = {
  A: { id: "00000000-0000-4000-8000-00000000000a", projectCount: 22 },
  B: { id: "00000000-0000-4000-8000-00000000000b", projectCount: 8 },
  C: { id: "00000000-0000-4000-8000-00000000000c", projectCount: 1 },
  D: { id: "00000000-0000-4000-8000-00000000000d", projectCount: 0 },
};

const membershipSeeds: {
  workspace: WorkspaceKey;
  user: UserKey;
  role: WorkspaceRole;
}[] = [
  { workspace: "A", user: "ownerAb", role: WorkspaceRole.OWNER },
  { workspace: "A", user: "ownerC", role: WorkspaceRole.ADMIN },
  { workspace: "A", user: "ownerD", role: WorkspaceRole.MEMBER },
  { workspace: "A", user: "member", role: WorkspaceRole.MEMBER },
  { workspace: "A", user: "admin", role: WorkspaceRole.ADMIN },
  { workspace: "B", user: "ownerAb", role: WorkspaceRole.OWNER },
  { workspace: "B", user: "ownerD", role: WorkspaceRole.MEMBER },
  { workspace: "B", user: "member", role: WorkspaceRole.MEMBER },
  { workspace: "B", user: "admin", role: WorkspaceRole.ADMIN },
  { workspace: "C", user: "ownerC", role: WorkspaceRole.OWNER },
  { workspace: "C", user: "ownerAb", role: WorkspaceRole.ADMIN },
  { workspace: "C", user: "member", role: WorkspaceRole.MEMBER },
  { workspace: "C", user: "admin", role: WorkspaceRole.ADMIN },
  { workspace: "D", user: "ownerD", role: WorkspaceRole.OWNER },
  { workspace: "D", user: "ownerAb", role: WorkspaceRole.MEMBER },
  { workspace: "D", user: "member", role: WorkspaceRole.MEMBER },
  { workspace: "D", user: "admin", role: WorkspaceRole.ADMIN },
];

const taskStatuses = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];
const taskPriorities = [
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

async function seed() {
  const usersWithHashes = await Promise.all(
    users.map(async (user) => ({
      ...user,
      passwordHash: await hashPassword(user.password),
    })),
  );

  await prisma.$transaction(async (tx) => {
    const userIds = new Map<UserKey, string>();

    for (const user of usersWithHashes) {
      const savedUser = await tx.user.upsert({
        where: { email: user.email },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: true,
        },
        update: {
          name: user.name,
          emailVerified: true,
        },
      });

      userIds.set(user.key, savedUser.id);

      const existingAccount = await tx.account.findFirst({
        where: { userId: savedUser.id, providerId: "credential" },
      });

      if (existingAccount) {
        await tx.account.update({
          where: { id: existingAccount.id },
          data: { accountId: savedUser.id, password: user.passwordHash },
        });
      } else {
        await tx.account.create({
          data: {
            id: `seed_account_${user.key}`,
            accountId: savedUser.id,
            providerId: "credential",
            userId: savedUser.id,
            password: user.passwordHash,
          },
        });
      }
    }

    const getUserId = (key: UserKey) => {
      const userId = userIds.get(key);
      if (!userId) {
        throw new Error(`Seed user ${key} was not created.`);
      }
      return userId;
    };

    for (const workspaceName of Object.keys(workspaces) as WorkspaceKey[]) {
      const workspace = workspaces[workspaceName];
      const owner = membershipSeeds.find(
        (membership) =>
          membership.workspace === workspaceName &&
          membership.role === WorkspaceRole.OWNER,
      );

      if (!owner) {
        throw new Error(`Workspace ${workspaceName} has no owner membership.`);
      }

      await tx.workspace.upsert({
        where: { id: workspace.id },
        create: {
          id: workspace.id,
          name: workspaceName,
          ownerId: getUserId(owner.user),
        },
        update: {
          name: workspaceName,
          ownerId: getUserId(owner.user),
        },
      });
    }

    const workspaceIds = Object.values(workspaces).map(({ id }) => id);
    await tx.workspaceMembership.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });
    await tx.project.deleteMany({
      where: { workspaceId: { in: workspaceIds } },
    });

    await tx.workspaceMembership.createMany({
      data: membershipSeeds.map(({ workspace, user, role }) => ({
        workspaceId: workspaces[workspace].id,
        userId: getUserId(user),
        role,
      })),
    });

    const membersByWorkspace = new Map<WorkspaceKey, string[]>();
    for (const membership of membershipSeeds) {
      const members = membersByWorkspace.get(membership.workspace) ?? [];
      members.push(getUserId(membership.user));
      membersByWorkspace.set(membership.workspace, members);
    }

    for (const workspaceName of Object.keys(workspaces) as WorkspaceKey[]) {
      const workspace = workspaces[workspaceName];

      for (
        let projectIndex = 0;
        projectIndex < workspace.projectCount;
        projectIndex++
      ) {
        const projectName = `${workspaceName} Project ${projectIndex + 1}`;
        const project = await tx.project.create({
          data: {
            workspaceId: workspace.id,
            name: projectName,
            description: `Seeded project ${projectIndex + 1} in workspace ${workspaceName}.`,
            createdById: getUserId("admin"),
          },
        });

        const taskCount = randomInt(0, 26);
        const members = membersByWorkspace.get(workspaceName);
        if (!members) {
          throw new Error(`Workspace ${workspaceName} has no members.`);
        }

        if (taskCount > 0) {
          await tx.task.createMany({
            data: Array.from({ length: taskCount }, (_, taskIndex) => ({
              projectId: project.id,
              title: `Task ${taskIndex + 1} for ${projectName}`,
              description: `Seeded task in workspace ${workspaceName}.`,
              status: taskStatuses[randomInt(0, taskStatuses.length)],
              priority: taskPriorities[randomInt(0, taskPriorities.length)],
              assigneeId:
                randomInt(0, 5) === 0
                  ? null
                  : members[randomInt(0, members.length)],
              createdById: getUserId("admin"),
              position: taskIndex,
            })),
          });
        }
      }
    }
  });
}

seed()
  .catch((error: unknown) => {
    console.error("Prisma seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
