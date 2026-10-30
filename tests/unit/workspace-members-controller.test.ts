import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteWorkspace,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  renameWorkspace,
  transferWorkspaceOwnership,
  updateWorkspaceMemberRole,
} from "@/lib/controllers/workspace.controller";

const {
  transaction,
  workspaceFindUnique,
  workspaceUpdate,
  workspaceDelete,
  userFindFirst,
  membershipCreate,
  membershipFindUnique,
  membershipUpdate,
  membershipDelete,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  workspaceFindUnique: vi.fn(),
  workspaceUpdate: vi.fn(),
  workspaceDelete: vi.fn(),
  userFindFirst: vi.fn(),
  membershipCreate: vi.fn(),
  membershipFindUnique: vi.fn(),
  membershipUpdate: vi.fn(),
  membershipDelete: vi.fn(),
}));

const tx = {
  workspace: {
    findUnique: workspaceFindUnique,
    update: workspaceUpdate,
    delete: workspaceDelete,
  },
  user: { findFirst: userFindFirst },
  workspaceMembership: {
    create: membershipCreate,
    findUnique: membershipFindUnique,
    update: membershipUpdate,
    delete: membershipDelete,
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transaction },
}));

const workspaceId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((operation) => operation(tx));
  workspaceFindUnique.mockResolvedValue({
    id: workspaceId,
    ownerId: "owner-1",
    memberships: [{ role: "ADMIN" }],
  });
  userFindFirst.mockResolvedValue({ id: "new-member" });
  membershipFindUnique.mockResolvedValue(null);
  membershipCreate.mockResolvedValue({ userId: "new-member", role: "MEMBER" });
  membershipUpdate.mockResolvedValue({ userId: "member-1", role: "ADMIN" });
});

describe("workspace member management", () => {
  it("allows an admin to rename a workspace", async () => {
    workspaceUpdate.mockResolvedValue({ id: workspaceId, name: "Design" });

    await expect(
      renameWorkspace({
        workspaceId,
        requesterId: "admin-1",
        name: "Design",
      }),
    ).resolves.toEqual({ id: workspaceId, name: "Design" });

    expect(workspaceUpdate).toHaveBeenCalledWith({
      where: { id: workspaceId },
      data: { name: "Design" },
      select: { id: true, name: true },
    });
  });

  it("allows the owner to delete a workspace", async () => {
    await deleteWorkspace({ workspaceId, requesterId: "owner-1" });

    expect(workspaceDelete).toHaveBeenCalledWith({
      where: { id: workspaceId },
    });
  });

  it("denies admins from deleting a workspace", async () => {
    await expect(
      deleteWorkspace({ workspaceId, requesterId: "admin-1" }),
    ).rejects.toMatchObject({ status: 403 });

    expect(workspaceDelete).not.toHaveBeenCalled();
  });

  it("denies regular members from renaming or deleting a workspace", async () => {
    workspaceFindUnique.mockResolvedValue({
      id: workspaceId,
      ownerId: "owner-1",
      memberships: [{ role: "MEMBER" }],
    });

    await expect(
      renameWorkspace({
        workspaceId,
        requesterId: "member-1",
        name: "Design",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      deleteWorkspace({ workspaceId, requesterId: "member-1" }),
    ).rejects.toMatchObject({ status: 403 });

    expect(workspaceUpdate).not.toHaveBeenCalled();
    expect(workspaceDelete).not.toHaveBeenCalled();
  });

  it("adds a registered user as a member after an admin invites by email", async () => {
    await expect(
      inviteWorkspaceMember({
        workspaceId,
        requesterId: "admin-1",
        email: "person@example.com",
      }),
    ).resolves.toEqual({ userId: "new-member", role: "MEMBER" });

    expect(userFindFirst).toHaveBeenCalledWith({
      where: { email: { equals: "person@example.com", mode: "insensitive" } },
      select: { id: true },
    });
    expect(membershipCreate).toHaveBeenCalledWith({
      data: {
        workspaceId,
        userId: "new-member",
        role: "MEMBER",
      },
      select: { userId: true, role: true },
    });
  });

  it("reports an unregistered email without creating a membership", async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(
      inviteWorkspaceMember({
        workspaceId,
        requesterId: "admin-1",
        email: "unknown@example.com",
      }),
    ).rejects.toMatchObject({ status: 404 });

    expect(membershipCreate).not.toHaveBeenCalled();
  });

  it("lets an admin change a non-owner role", async () => {
    membershipFindUnique.mockResolvedValue({
      userId: "member-1",
      role: "MEMBER",
    });

    await updateWorkspaceMemberRole({
      workspaceId,
      requesterId: "admin-1",
      memberId: "member-1",
      role: "ADMIN",
    });

    expect(membershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "ADMIN" } }),
    );
  });

  it("denies a regular member from changing roles", async () => {
    workspaceFindUnique.mockResolvedValue({
      id: workspaceId,
      ownerId: "owner-1",
      memberships: [{ role: "MEMBER" }],
    });

    await expect(
      updateWorkspaceMemberRole({
        workspaceId,
        requesterId: "member-1",
        memberId: "member-2",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(membershipUpdate).not.toHaveBeenCalled();
  });

  it("does not allow admins to change or remove the workspace owner", async () => {
    membershipFindUnique.mockResolvedValue({
      userId: "owner-1",
      role: "OWNER",
    });

    await expect(
      updateWorkspaceMemberRole({
        workspaceId,
        requesterId: "admin-1",
        memberId: "owner-1",
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      removeWorkspaceMember({
        workspaceId,
        requesterId: "admin-1",
        memberId: "owner-1",
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(membershipDelete).not.toHaveBeenCalled();
  });

  it("transfers ownership atomically and leaves the former owner as an admin", async () => {
    workspaceFindUnique.mockResolvedValue({
      id: workspaceId,
      ownerId: "owner-1",
    });
    membershipFindUnique.mockResolvedValue({ userId: "new-owner" });

    await transferWorkspaceOwnership({
      workspaceId,
      requesterId: "owner-1",
      newOwnerId: "new-owner",
    });

    expect(membershipUpdate).toHaveBeenNthCalledWith(1, {
      where: {
        workspaceId_userId: { workspaceId, userId: "owner-1" },
      },
      data: { role: "ADMIN" },
    });
    expect(membershipUpdate).toHaveBeenNthCalledWith(2, {
      where: {
        workspaceId_userId: { workspaceId, userId: "new-owner" },
      },
      data: { role: "OWNER" },
    });
    expect(workspaceUpdate).toHaveBeenCalledWith({
      where: { id: workspaceId },
      data: { ownerId: "new-owner" },
    });
  });

  it("does not let an admin transfer ownership", async () => {
    await expect(
      transferWorkspaceOwnership({
        workspaceId,
        requesterId: "admin-1",
        newOwnerId: "new-owner",
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(workspaceUpdate).not.toHaveBeenCalled();
  });
});
