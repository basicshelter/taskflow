import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import styles from "./home.module.scss";

export default function Home() {
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
        <Suspense fallback={<AccountLinks />}>
          <AccountNavigation />
        </Suspense>
      </header>

      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot} />A calmer way to get things done
        </div>
        <h1>
          Big plans.
          <br />
          <span>Small steps.</span>
          <br />
          Real progress.
        </h1>
        <p>
          Bring your projects, priorities, and people together. Make room for
          the work that matters.
        </p>
        <Link className={styles.heroCta} href="/sign-up">
          Start your workspace <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <section className={styles.preview} aria-label="Taskflow preview">
        <div className={styles.previewTop}>
          <div>
            <span className={styles.previewLabel}>YOUR SPACE</span>
            <h2>This week</h2>
          </div>
          <span className={styles.weekTag}>Week 24</span>
        </div>
        <div className={styles.progress}>
          <div className={styles.progressHeading}>
            <span>Weekly focus</span>
            <span>68%</span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Weekly focus"
            aria-valuenow={68}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span />
          </div>
        </div>
        <div className={styles.taskList}>
          <div className={styles.task}>
            <span className={styles.taskCheck}>✓</span>
            <span className={styles.taskDone}>Map out the launch plan</span>
            <span className={styles.taskTag}>Planning</span>
          </div>
          <div className={styles.task}>
            <span className={styles.taskCheck} />
            <span>Share the first prototype</span>
            <span className={styles.taskTag}>Design</span>
          </div>
          <div className={styles.task}>
            <span className={styles.taskCheck} />
            <span>Gather feedback from the team</span>
            <span className={styles.taskTag}>Research</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Less juggling. More doing.</span>
        <span>Made for your next big thing.</span>
      </footer>
    </main>
  );
}

async function AccountNavigation() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return <AccountLinks />;
  }

  return (
    <div className={styles.account}>
      <span className={styles.accountName}>
        {session.user.name || session.user.email}
      </span>
      <SignOutButton />
    </div>
  );
}

function AccountLinks() {
  return (
    <nav className={styles.navigation} aria-label="Account">
      <Link href="/sign-in">Sign in</Link>
      <Link className={styles.navCta} href="/sign-up">
        Get started <span aria-hidden="true">↗</span>
      </Link>
    </nav>
  );
}
