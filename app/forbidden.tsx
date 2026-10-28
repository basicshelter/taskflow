import Link from "next/link";
import styles from "./home.module.scss";

export default function Forbidden() {
  return (
    <main className={`${styles.page} ${styles.forbiddenPage}`}>
      <section className={styles.forbiddenContent}>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} />
          403 · ACCESS RESTRICTED
        </div>
        <h1>You don’t have access to this workspace.</h1>
        <p>Only workspace members can view its projects and details.</p>
        <Link className={styles.heroCta} href="/workspaces">
          Back to your workspaces
        </Link>
      </section>
    </main>
  );
}
