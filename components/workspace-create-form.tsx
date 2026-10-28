"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";
import styles from "@/app/home.module.scss";

export function WorkspaceCreateForm() {
  const router = useRouter();
  const createWorkspace = useMutation<void, Error, string>({
    mutationFn: async (name) => {
      const response = await axios.post(
        "/api/v1/workspaces",
        { name },
        {
          validateStatus: () => true,
        },
      );

      if (response.status < 200 || response.status >= 300) {
        throw new WorkspaceCreateError(response.status);
      }
    },
    onSuccess: () => router.replace("/workspaces"),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createWorkspace.mutate(String(formData.get("name") ?? ""));
  }

  return (
    <form className={styles.workspaceCreateForm} onSubmit={handleSubmit}>
      <label className={styles.workspaceNameField}>
        <input
          aria-label="Workspace name"
          autoComplete="organization"
          className={styles.workspaceNameInput}
          maxLength={100}
          minLength={2}
          name="name"
          placeholder="e.g. Studio North"
          required
        />
      </label>
      <button
        className={styles.heroCta}
        disabled={createWorkspace.isPending}
        type="submit"
      >
        {createWorkspace.isPending
          ? "Creating workspace..."
          : "Create workspace"}
        {!createWorkspace.isPending && <span aria-hidden="true">↗</span>}
      </button>
      {createWorkspace.isError && (
        <p className={styles.workspaceCreateError} role="alert">
          {getWorkspaceCreateErrorMessage(createWorkspace.error)}
        </p>
      )}
    </form>
  );
}

class WorkspaceCreateError extends Error {
  constructor(readonly status: number) {
    super("Unable to create your workspace. Please try again.");
  }
}

function getWorkspaceCreateErrorMessage(error: Error) {
  if (error instanceof WorkspaceCreateError) {
    if (error.status === 401) {
      return "Please sign in again to create a workspace.";
    }

    if (error.status === 400) {
      return "Enter a workspace name between 2 and 100 characters.";
    }

    return "Unable to create your workspace. Please try again.";
  }

  return error.message || "Unable to create your workspace. Please try again.";
}
