"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import styles from "@/app/home.module.scss";

type ProjectUpdate = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
};

type ProjectAction =
  | { kind: "update"; name: string; description: string | null }
  | { kind: "archive" };

export function ProjectSettings({
  isArchived,
  projectDescription,
  projectId,
  projectName,
}: {
  isArchived: boolean;
  projectDescription: string | null;
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const archiveDialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation<ProjectUpdate, Error, ProjectAction>({
    mutationFn: (action) => performProjectAction(projectId, action),
    onMutate: () => setNotice(null),
    onSuccess: (project, action) => {
      if (action.kind === "archive") {
        setIsArchiveOpen(false);
        setNotice("Project archived.");
      } else {
        setName(project.name);
        setDescription(project.description ?? "");
        setNotice("Project details updated.");
      }

      router.refresh();
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const dialog = archiveDialogRef.current;
    if (!dialog) return;

    if (isArchiveOpen && !dialog.open) dialog.showModal();
    else if (!isArchiveOpen && dialog.open) dialog.close();
  }, [isArchiveOpen]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;

    mutation.mutate({
      kind: "update",
      name,
      description: description.trim() || null,
    });
  }

  return (
    <div className={styles.projectSettingsContainer}>
      <button
        aria-label={`Manage project ${projectName}`}
        className={styles.projectSettingsTrigger}
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
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            transform="translate(1 1) scale(.92)"
          />
        </svg>
        <span className={styles.visuallyHidden}>Project settings</span>
      </button>
      <dialog
        aria-labelledby={headingId}
        className={styles.workspaceMembersDialog}
        onCancel={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <section>
          <div className={styles.workspaceMembersHeading}>
            <h2 id={headingId}>{projectName} settings</h2>
            <button
              aria-label="Close project settings"
              className={styles.workspaceMembersClose}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          <form className={styles.projectSettingsForm} onSubmit={handleSubmit}>
            <label>
              Project name
              <input
                disabled={isArchived || mutation.isPending}
                maxLength={120}
                minLength={2}
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
            </label>
            <label>
              Description
              <textarea
                disabled={isArchived || mutation.isPending}
                maxLength={2000}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={4}
                value={description}
              />
            </label>
            {!isArchived && (
              <button
                className={styles.projectSaveButton}
                disabled={mutation.isPending}
                type="submit"
              >
                {mutation.isPending && mutation.variables?.kind === "update"
                  ? "Saving..."
                  : "Save changes"}
              </button>
            )}
          </form>

          {isArchived ? (
            <p className={styles.workspaceMemberNotice}>
              This project is archived and read-only.
            </p>
          ) : (
            <section className={styles.workspaceSettingsSection}>
              <h3 className={styles.workspaceSettingsSectionTitle}>
                Archive project
              </h3>
              <p className={styles.projectSettingsHelp}>
                Archived projects are read-only and appear at the bottom of the
                project list.
              </p>
              <button
                className={styles.workspaceDeleteButton}
                disabled={mutation.isPending}
                onClick={() => setIsArchiveOpen(true)}
                type="button"
              >
                Archive project
              </button>
            </section>
          )}

          {mutation.isError && (
            <p className={styles.workspaceCreateError} role="alert">
              {getProjectActionErrorMessage(mutation.error)}
            </p>
          )}
          {notice && <p className={styles.workspaceMemberNotice}>{notice}</p>}
        </section>
      </dialog>
      {!isArchived && (
        <dialog
          aria-labelledby={`${headingId}-archive-title`}
          className={styles.workspaceMembersDialog}
          onCancel={() => setIsArchiveOpen(false)}
          onClose={() => setIsArchiveOpen(false)}
          ref={archiveDialogRef}
        >
          <section>
            <div className={styles.workspaceMembersHeading}>
              <h2 id={`${headingId}-archive-title`}>Archive project?</h2>
              <button
                aria-label="Close archive project confirmation"
                className={styles.workspaceMembersClose}
                onClick={() => setIsArchiveOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p>
              <strong>{projectName}</strong> will become read-only and move to
              the bottom of the project list.
            </p>
            {mutation.isError && mutation.variables?.kind === "archive" && (
              <p className={styles.workspaceCreateError} role="alert">
                {getProjectActionErrorMessage(mutation.error)}
              </p>
            )}
            <div className={styles.workspaceDeleteActions}>
              <button
                disabled={mutation.isPending}
                onClick={() => setIsArchiveOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ kind: "archive" })}
                type="button"
              >
                {mutation.isPending && mutation.variables?.kind === "archive"
                  ? "Archiving project..."
                  : "Archive project"}
              </button>
            </div>
          </section>
        </dialog>
      )}
    </div>
  );
}

async function performProjectAction(
  projectId: string,
  action: ProjectAction,
): Promise<ProjectUpdate> {
  try {
    const response = await axios.patch<ProjectUpdate>(
      `/api/v1/projects/${projectId}`,
      action.kind === "update"
        ? { name: action.name, description: action.description }
        : { archive: true },
    );
    return response.data;
  } catch (error) {
    throw new Error(getProjectActionErrorMessage(error), { cause: error });
  }
}

function getProjectActionErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: unknown }>(error)) {
    const responseMessage = error.response?.data?.error;
    if (typeof responseMessage === "string") return responseMessage;
    return error.message || "Unable to update this project.";
  }

  if (error instanceof Error) {
    return error.message || "Unable to update this project.";
  }

  return "Unable to update this project.";
}
