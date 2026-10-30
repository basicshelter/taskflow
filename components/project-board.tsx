"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/app/home.module.scss";
import { SignOutButton } from "@/components/sign-out-button";
import type { TaskStatus } from "@/generated/prisma/client";

type ProjectBoardProps = {
  project: {
    name: string;
    description: string | null;
    isArchived: boolean;
    tasks: {
      id: string;
      title: string;
      description: string | null;
      status: TaskStatus;
    }[];
  };
  workspaceId: string;
  userName: string;
};

const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

export function ProjectBoard({
  project,
  workspaceId,
  userName,
}: ProjectBoardProps) {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  return (
    <main className={styles.projectPage}>
      <header
        className={`${styles.header} ${styles.projectPageHeader} ${
          isHeaderCollapsed ? styles.projectPageHeaderCollapsed : ""
        }`}
      >
        <div className={styles.headerBrandGroup}>
          <Link className={styles.brand} href="/" aria-label="Taskflow home">
            <span className={styles.brandMark} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            taskflow
          </Link>
          <div className={`${styles.eyebrow} ${styles.headerContext}`}>
            <span className={styles.statusDot} />
            PROJECT
          </div>
        </div>
        {isHeaderCollapsed && (
          <div className={styles.compactProjectTitle}>
            <Link
              className={styles.compactWorkspaceLink}
              href={`/workspaces/${workspaceId}`}
            >
              Workspace
            </Link>
            <span aria-hidden="true">/</span>
            <span>{project.name}</span>
            <button
              aria-expanded={!isHeaderCollapsed}
              className={styles.collapseHeaderButton}
              onClick={() => setIsHeaderCollapsed(false)}
              type="button"
            >
              Show header
            </button>
          </div>
        )}
        <div className={styles.account}>
          <span className={styles.accountName}>{userName}</span>
          <SignOutButton />
        </div>
      </header>

      <section className={styles.projectDetails}>
        {project.isArchived && (
          <p className={styles.archivedProjectNotice} role="status">
            This project is archived and read-only.
          </p>
        )}
        {!isHeaderCollapsed && (
          <div className={styles.projectIntro}>
            <Link
              className={styles.workspaceBackLink}
              href={`/workspaces/${workspaceId}`}
            >
              ← Back to workspace
            </Link>
            <div className={styles.projectTitleLine}>
              <div className={styles.projectHeading}>
                <h1>{project.name}</h1>
              </div>
              <button
                aria-expanded={!isHeaderCollapsed}
                className={styles.collapseHeaderButton}
                onClick={() => setIsHeaderCollapsed(true)}
                type="button"
              >
                Collapse header
              </button>
            </div>
            {project.description && (
              <p className={styles.projectDescription}>{project.description}</p>
            )}
          </div>
        )}

        <section className={styles.board} aria-label="Tasks by status">
          {(Object.keys(taskStatusLabels) as TaskStatus[]).map((status) => {
            const tasks = project.tasks.filter(
              (task) => task.status === status,
            );

            return (
              <section
                className={styles.boardColumn}
                key={status}
                aria-labelledby={`status-${status}`}
              >
                <header className={styles.boardColumnHeader}>
                  <h2 id={`status-${status}`}>{taskStatusLabels[status]}</h2>
                  <span>{tasks.length}</span>
                </header>
                {tasks.length > 0 ? (
                  <ul className={styles.taskList}>
                    {tasks.map((task) => (
                      <li className={styles.taskCard} key={task.id}>
                        <h3>{task.title}</h3>
                        {task.description && <p>{task.description}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.emptyColumn}>No tasks yet.</p>
                )}
              </section>
            );
          })}
        </section>
      </section>
    </main>
  );
}
