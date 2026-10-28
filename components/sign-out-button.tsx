"use client";

import { useState } from "react";
import styles from "@/app/home.module.scss";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setErrorMessage("");
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setErrorMessage(
          result.error.message || "Unable to sign out. Try again.",
        );
        return;
      }

      window.location.assign("/sign-in");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <span className={styles.signOutArea}>
      <button
        className={styles.signOutButton}
        disabled={isSigningOut}
        onClick={handleSignOut}
        type="button"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage && (
        <span className={styles.signOutError} role="alert">
          {errorMessage}
        </span>
      )}
    </span>
  );
}
