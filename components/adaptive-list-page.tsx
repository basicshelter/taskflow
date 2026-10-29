"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "@/app/home.module.scss";
import { SignOutButton } from "@/components/sign-out-button";

type AdaptiveListPageProps = {
  children: ReactNode;
  compactBackHref?: string;
  compactBackLabel?: string;
  context: string;
  pageTitle: string;
  userName: string;
};

export function AdaptiveListPage({
  children,
  compactBackHref,
  compactBackLabel,
  context,
  pageTitle,
  userName,
}: AdaptiveListPageProps) {
  const pageRef = useRef<HTMLElement>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const collapseWhenPageOverflows = () => {
      if (page.scrollHeight > window.innerHeight) {
        setIsHeaderCollapsed(true);
      }
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(collapseWhenPageOverflows);
    resizeObserver?.observe(page);
    window.addEventListener("resize", collapseWhenPageOverflows);
    collapseWhenPageOverflows();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", collapseWhenPageOverflows);
    };
  }, []);

  return (
    <main
      className={`${styles.page} ${
        isHeaderCollapsed ? styles.listPageCompact : ""
      }`}
      ref={pageRef}
    >
      <header
        className={`${styles.header} ${
          isHeaderCollapsed ? styles.listPageHeaderCollapsed : ""
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
            {context}
          </div>
        </div>
        {isHeaderCollapsed && (
          <div className={styles.compactListTitle}>
            {compactBackHref && compactBackLabel && (
              <>
                <Link href={compactBackHref}>{compactBackLabel}</Link>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span>{pageTitle}</span>
          </div>
        )}
        <div className={styles.account}>
          <span className={styles.accountName}>{userName}</span>
          <SignOutButton />
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <span>Less juggling. More doing.</span>
        <span>Made for your next big thing.</span>
      </footer>
    </main>
  );
}
