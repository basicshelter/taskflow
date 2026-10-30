import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/home.module.scss";
import { AdaptiveListPage } from "@/components/adaptive-list-page";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { verifySession } from "@/lib/auth-session";
import {
  getWorkspaceMembersForWorkspaces,
  getWorkspaceMemberships,
} from "@/lib/workspaces";

export default function WorkspacesPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page} aria-busy="true">
          <p className={styles.sessionCheck}>Loading your workspaces...</p>
        </main>
      }
    >
      <WorkspaceList />
    </Suspense>
  );
}

async function WorkspaceList() {
  const { user } = await verifySession();
  const memberships = await getWorkspaceMemberships(user.id);
  const memberLists = await getWorkspaceMembersForWorkspaces(
    memberships.map(({ workspace }) => workspace.id),
  );

  return (
    <AdaptiveListPage
      context="YOUR SPACES"
      pageTitle="Workspaces"
      userName={user.name || user.email}
    >
      <section className={styles.workspaceList}>
        <h1 className={`${styles.workspacePageTitle} ${styles.listPageIntro}`}>
          Workspaces
        </h1>
        {memberships.length > 0 ? (
          <ul className={styles.workspaceItems}>
            {memberships.map(({ role, workspace }) => (
              <li className={styles.workspaceItem} key={workspace.id}>
                <Link
                  className={`${styles.navigationCard} ${styles.workspaceLink}`}
                  href={`/workspaces/${workspace.id}`}
                >
                  <span className={styles.workspaceLinkDetails}>
                    <span>{workspace.name}</span>
                    <span className={styles.workspaceRole}>
                      {role.toLowerCase()}
                    </span>
                  </span>
                </Link>
                <WorkspaceSettings
                  currentUserRole={role}
                  members={memberLists[workspace.id] ?? []}
                  workspaceId={workspace.id}
                  workspaceName={workspace.name}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.workspaceEmpty}>
            <p>You are not a member of any workspaces yet.</p>
            <p>Create your first workspace to get started.</p>
          </div>
        )}
        <WorkspaceCreateForm />
      </section>
    </AdaptiveListPage>
  );
}
