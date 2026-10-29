import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import styles from "@/app/home.module.scss";
import { ProjectCreateForm } from "@/components/project-create-form";
import { SignOutButton } from "@/components/sign-out-button";
import { verifySession } from "@/lib/auth-session";
import { getWorkspaceDetails } from "@/lib/workspaces";

export const instant = false;

export default async function WorkspaceDetailsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user } = await verifySession();

  const parsedWorkspaceId = z.uuid().safeParse(workspaceId);

  if (!parsedWorkspaceId.success) {
    notFound();
  }

  const workspace = await getWorkspaceDetails(parsedWorkspaceId.data, user.id);

  if (!workspace) {
    notFound();
  }

  const membership = workspace.memberships[0];

  if (!membership) {
    forbidden();
  }

  const canCreateProjects =
    membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Taskflow home">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          taskflow
        </Link>
        <div className={styles.account}>
          <span className={styles.accountName}>{user.name || user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className={styles.workspaceList}>
        <Link className={styles.workspaceBackLink} href="/workspaces">
          ← All workspaces
        </Link>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} />
          WORKSPACE
        </div>
        <h1>{workspace.name}</h1>
        {workspace.projects.length > 0 ? (
          <>
            {canCreateProjects && (
              <ProjectCreateForm workspaceId={workspace.id} />
            )}
            <ul className={styles.projectItems} aria-label="Projects">
              {workspace.projects.map((project) => (
                <li className={styles.projectItem} key={project.id}>
                  <h2>{project.name}</h2>
                  {project.description && <p>{project.description}</p>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className={styles.projectEmpty}>
            <span className={styles.projectEmptyIcon} aria-hidden="true">
              +
            </span>
            {canCreateProjects ? (
              <>
                <h2>Your first project starts here.</h2>
                <p>
                  Create a project to bring the work for this workspace
                  together.
                </p>
                <ProjectCreateForm workspaceId={workspace.id} />
              </>
            ) : (
              <>
                <h2>This workspace doesn’t have any projects yet.</h2>
                <p>Ask an owner or admin to create the first project.</p>
              </>
            )}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <span>Less juggling. More doing.</span>
        <span>Made for your next big thing.</span>
      </footer>
    </main>
  );
}
