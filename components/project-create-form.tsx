"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import type { SubmitEvent } from "react";
import styles from "@/app/home.module.scss";

export function ProjectCreateForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const createProject = useMutation<void, Error, string>({
    mutationFn: async (name) => {
      const response = await axios.post(
        `/api/v1/workspaces/${workspaceId}/projects`,
        { name },
        {
          validateStatus: () => true,
        },
      );

      if (response.status < 200 || response.status >= 300) {
        throw new ProjectCreateError(response.status);
      }
    },
    onSuccess: () => router.refresh(),
  });

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createProject.mutate(String(formData.get("name") ?? ""));
  }

  return (
    <form className={styles.projectCreateForm} onSubmit={handleSubmit}>
      <label className={styles.workspaceNameField}>
        <input
          aria-label="Project name"
          className={styles.workspaceNameInput}
          maxLength={120}
          minLength={2}
          name="name"
          placeholder="e.g. Website redesign"
          required
        />
      </label>
      <button
        className={styles.heroCta}
        disabled={createProject.isPending}
        type="submit"
      >
        {createProject.isPending ? "Creating project..." : "Create project"}
        {!createProject.isPending && <span aria-hidden="true">↗</span>}
      </button>
      {createProject.isError && (
        <p className={styles.workspaceCreateError} role="alert">
          {getProjectCreateErrorMessage(createProject.error)}
        </p>
      )}
    </form>
  );
}

class ProjectCreateError extends Error {
  constructor(readonly status: number) {
    super("Unable to create your project. Please try again.");
  }
}

function getProjectCreateErrorMessage(error: Error) {
  if (error instanceof ProjectCreateError) {
    if (error.status === 401) {
      return "Please sign in again to create a project.";
    }

    if (error.status === 403) {
      return "Only workspace owners and admins can create projects.";
    }

    if (error.status === 404) {
      return "This workspace could not be found.";
    }

    if (error.status === 400) {
      return "Enter a project name between 2 and 120 characters.";
    }

    return "Unable to create your project. Please try again.";
  }

  return error.message || "Unable to create your project. Please try again.";
}
