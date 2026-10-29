import Link from "next/link";
import { Suspense } from "react";
import styles from "@/app/home.module.scss";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { verifySession } from "@/lib/auth-session";
import { getWorkspaceMemberships } from "@/lib/workspaces";

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
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} />
          YOUR SPACES
        </div>
        <h1>Workspaces</h1>
        {memberships.length > 0 ? (
          <ul className={styles.workspaceItems}>
            {memberships.map(({ role, workspace }) => (
              <li className={styles.workspaceItem} key={workspace.id}>
                <Link
                  className={styles.workspaceLink}
                  href={`/workspaces/${workspace.id}`}
                >
                  {workspace.name}
                </Link>
                <span className={styles.workspaceRole}>
                  {role.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.workspaceEmpty}>
            <p>You are not a member of any workspaces yet.</p>
            <p>Create your first workspace to get started.</p>
            <WorkspaceCreateForm />
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
