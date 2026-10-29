"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import styles from "@/app/home.module.scss";

type WorkspaceMember = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type MemberAction =
  | { kind: "invite"; email: string }
  | { kind: "update-role"; memberId: string; role: "ADMIN" | "MEMBER" }
  | { kind: "remove"; memberId: string }
  | { kind: "transfer-ownership"; newOwnerId: string };

export function WorkspaceMembers({
  members,
  currentUserRole,
  workspaceId,
  workspaceName,
}: {
  members: WorkspaceMember[];
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  workspaceId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const canManageMembers =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const otherMembers = members.filter((member) => member.role !== "OWNER");

  const memberMutation = useMutation<void, Error, MemberAction>({
    mutationFn: (action) => performMemberAction(workspaceId, action),
    onMutate: () => setNotice(null),
    onSuccess: (_data, action) => {
      router.refresh();

      switch (action.kind) {
        case "invite":
          setEmail("");
          setNotice("Member added to the workspace.");
          break;
        case "update-role":
          setNotice("Member role updated.");
          break;
        case "remove":
          setNotice("Member removed from the workspace.");
          break;
        case "transfer-ownership":
          setNotice("Workspace ownership transferred.");
          break;
      }
    },
  });
  const isAddingMember =
    memberMutation.isPending && memberMutation.variables?.kind === "invite";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleInvite(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memberMutation.isPending) {
      return;
    }

    memberMutation.mutate({ kind: "invite", email });
  }

  function handleRoleChange(memberId: string, value: string) {
    if (value !== "ADMIN" && value !== "MEMBER") {
      return;
    }

    memberMutation.mutate({ kind: "update-role", memberId, role: value });
  }

  function handleRemove(memberId: string) {
    memberMutation.mutate({ kind: "remove", memberId });
  }

  function handleTransferOwnership() {
    if (!newOwnerId) {
      return;
    }

    memberMutation.mutate({ kind: "transfer-ownership", newOwnerId });
  }

  return (
    <div className={styles.workspaceMemberDialogContainer}>
      <button
        aria-label={`View members of ${workspaceName}`}
        className={styles.workspaceMemberTrigger}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="18"
          viewBox="0 0 24 24"
          width="18"
        >
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        <span className={styles.visuallyHidden}>Members</span>
      </button>
      <dialog
        aria-labelledby={headingId}
        className={styles.workspaceMembersDialog}
        onCancel={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <section className={styles.workspaceMembers}>
          <div className={styles.workspaceMembersHeading}>
            <div>
              <h2 id={headingId}>{workspaceName}&apos;s Members</h2>
            </div>
            <span className={styles.workspaceMemberCount}>
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
            <button
              aria-label="Close members dialog"
              className={styles.workspaceMembersClose}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <ul
            className={styles.workspaceMemberList}
            aria-label="Workspace members"
          >
            {members.map((member) => {
              const isOwner = member.role === "OWNER";

              return (
                <li className={styles.workspaceMember} key={member.userId}>
                  <div className={styles.workspaceMemberIdentity}>
                    <span>{member.name}</span>
                    <span>{member.email}</span>
                  </div>
                  <span className={styles.workspaceRole}>
                    {member.role.toLowerCase()}
                  </span>
                  {canManageMembers && !isOwner && (
                    <div className={styles.workspaceMemberActions}>
                      <label>
                        <span className={styles.visuallyHidden}>
                          Role for {member.email}
                        </span>
                        <select
                          aria-label={`Role for ${member.email}`}
                          disabled={memberMutation.isPending}
                          onChange={(event) =>
                            handleRoleChange(
                              member.userId,
                              event.currentTarget.value,
                            )
                          }
                          value={member.role}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </label>
                      <button
                        aria-label={`Remove ${member.email}`}
                        className={styles.workspaceMemberRemove}
                        disabled={memberMutation.isPending}
                        onClick={() => handleRemove(member.userId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {canManageMembers && (
            <form
              className={styles.workspaceMemberInvite}
              onSubmit={handleInvite}
            >
              <label htmlFor={`${headingId}-member-email`}>
                Invite a registered user
              </label>
              <div className={styles.workspaceMemberInviteFields}>
                <input
                  autoComplete="email"
                  disabled={memberMutation.isPending}
                  id={`${headingId}-member-email`}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
                <button disabled={isAddingMember} type="submit">
                  {isAddingMember ? "Adding member..." : "Add member"}
                </button>
              </div>
            </form>
          )}

          {currentUserRole === "OWNER" && otherMembers.length > 0 && (
            <div className={styles.workspaceOwnership}>
              <label htmlFor={`${headingId}-new-owner`}>
                Transfer ownership
              </label>
              <div className={styles.workspaceMemberInviteFields}>
                <select
                  disabled={memberMutation.isPending}
                  id={`${headingId}-new-owner`}
                  onChange={(event) => setNewOwnerId(event.currentTarget.value)}
                  value={newOwnerId}
                >
                  <option value="">Choose a workspace member</option>
                  {otherMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
                <button
                  disabled={memberMutation.isPending || !newOwnerId}
                  onClick={handleTransferOwnership}
                  type="button"
                >
                  Transfer ownership
                </button>
              </div>
            </div>
          )}

          {memberMutation.isError && (
            <p className={styles.workspaceCreateError} role="alert">
              {memberMutation.error.message}
            </p>
          )}
          {notice && <p className={styles.workspaceMemberNotice}>{notice}</p>}
        </section>
      </dialog>
    </div>
  );
}

async function performMemberAction(
  workspaceId: string,
  action: MemberAction,
): Promise<void> {
  const workspacePath = `/api/v1/workspaces/${workspaceId}`;

  try {
    switch (action.kind) {
      case "invite":
        await axios.post(`${workspacePath}/members`, { email: action.email });
        return;
      case "update-role":
        await axios.patch(`${workspacePath}/members/${action.memberId}`, {
          role: action.role,
        });
        return;
      case "remove":
        await axios.delete(`${workspacePath}/members/${action.memberId}`);
        return;
      case "transfer-ownership":
        await axios.post(`${workspacePath}/ownership`, {
          newOwnerId: action.newOwnerId,
        });
        return;
    }
  } catch (error) {
    const message = getMemberActionErrorMessage(error);
    throw new Error(message, { cause: error });
  }
}

function getMemberActionErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: unknown }>(error)) {
    const responseMessage = error.response?.data?.error;

    if (typeof responseMessage === "string") {
      return responseMessage;
    }

    return error.message || "Unable to update workspace members.";
  }

  if (error instanceof Error) {
    return error.message || "Unable to update workspace members.";
  }

  return "Unable to update workspace members.";
}
