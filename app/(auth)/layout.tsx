import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import styles from "@/app/auth.module.scss";
import { auth } from "@/lib/auth";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className={styles.page} aria-busy="true">
          <p className={styles.sessionCheck}>Checking your session…</p>
        </main>
      }
    >
      <SignedOutOnly>{children}</SignedOutOnly>
    </Suspense>
  );
}

async function SignedOutOnly({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return children;
}
