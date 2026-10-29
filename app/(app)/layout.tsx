import type { ReactNode } from "react";
import { Suspense } from "react";
import styles from "@/app/home.module.scss";
import { verifySession } from "@/lib/auth-session";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className={styles.page} aria-busy="true">
          <p className={styles.sessionCheck}>Checking your session...</p>
        </main>
      }
    >
      <AuthenticatedOnly>{children}</AuthenticatedOnly>
    </Suspense>
  );
}

async function AuthenticatedOnly({ children }: { children: ReactNode }) {
  await verifySession();
  return children;
}
