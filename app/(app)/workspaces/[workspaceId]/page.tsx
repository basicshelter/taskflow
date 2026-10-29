import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import styles from "@/app/home.module.scss";
import { AdaptiveListPage } from "@/components/adaptive-list-page";
import { ProjectCreateForm } from "@/components/project-create-form";
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
    <AdaptiveListPage
      compactBackHref="/workspaces"
      compactBackLabel="All workspaces"
      context="WORKSPACE"
      pageTitle={workspace.name}
      userName={user.name || user.email}
    >
      <section className={styles.workspaceList}>
        <div className={styles.listPageIntro}>
          <Link className={styles.workspaceBackLink} href="/workspaces">
            ← All workspaces
          </Link>
          <h1 className={styles.workspacePageTitle}>{workspace.name}</h1>
        </div>
        {workspace.projects.length > 0 ? (
          <>
            {canCreateProjects && (
              <ProjectCreateForm workspaceId={workspace.id} />
            )}
            <ul className={styles.projectItems} aria-label="Projects">
              {workspace.projects.map((project) => (
                <li className={styles.projectItem} key={project.id}>
                  <Link
                    className={`${styles.navigationCard} ${styles.projectLink}`}
                    href={`/projects/${project.id}`}
                  >
                    <h2>{project.name}</h2>
                    {project.description && <p>{project.description}</p>}
                  </Link>
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
    </AdaptiveListPage>
  );
}
