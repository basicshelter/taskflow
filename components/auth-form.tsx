"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import styles from "@/app/auth.module.scss";
import { authClient } from "@/lib/auth-client";
import {
  type AuthField,
  signInSchema,
  signUpSchema,
} from "@/lib/auth-validation";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AuthField, string>>
  >({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    let request: ReturnType<typeof authClient.signIn.email>;

    if (isSignUp) {
      const validation = signUpSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      });

      if (!validation.success) {
        setFieldErrors(getFieldErrors(validation.error.issues));
        return;
      }

      request = authClient.signUp.email(validation.data);
    } else {
      const validation = signInSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
      });

      if (!validation.success) {
        setFieldErrors(getFieldErrors(validation.error.issues));
        return;
      }

      request = authClient.signIn.email(validation.data);
    }

    setIsSubmitting(true);

    try {
      const result = await request;

      if (result.error) {
        setErrorMessage(
          result.error.message || "Unable to authenticate. Try again.",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/" aria-label="Taskflow home">
        <span className={styles.brandMark} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        taskflow
      </Link>

      <div className={styles.shell}>
        <section className={styles.story}>
          <div className={styles.storyGlow} />
          <div className={styles.storyContent}>
            <span className={styles.storyEyebrow}>MAKE WORK FEEL LIGHTER</span>
            <h1>
              Your next
              <br />
              great thing
              <br />
              <span>starts here.</span>
            </h1>
            <p>
              A little clarity goes a long way. Keep your team in sync and your
              best ideas moving.
            </p>
          </div>
          <div className={styles.quote}>
            <div className={styles.avatarStack} aria-hidden="true">
              <span>J</span>
              <span>M</span>
              <span>A</span>
              <span>+</span>
            </div>
            <span>Good work happens together.</span>
          </div>
          <div className={styles.storyDecor} aria-hidden="true">
            <span className={styles.decorLine} />
            <span className={styles.decorOrb} />
            <span className={styles.decorStar}>✳</span>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeading}>
            <span className={styles.welcomeLabel}>
              {isSignUp ? "YOUR SPACE IS WAITING" : "GOOD TO SEE YOU"}
            </span>
            <h2>{isSignUp ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isSignUp
                ? "Start making room for what matters."
                : "Sign in to pick up where you left off."}
            </p>
          </div>

          <form className={styles.form} noValidate onSubmit={handleSubmit}>
            {isSignUp && (
              <label className={styles.field}>
                <span>Your name</span>
                <input
                  autoComplete="name"
                  name="name"
                  placeholder="Alex Morgan"
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <span
                    className={styles.fieldError}
                    id="name-error"
                    role="alert"
                  >
                    {fieldErrors.name}
                  </span>
                )}
              </label>
            )}
            <label className={styles.field}>
              <span>Email address</span>
              <input
                autoComplete="email"
                name="email"
                placeholder="you@company.com"
                type="email"
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && (
                <span
                  className={styles.fieldError}
                  id="email-error"
                  role="alert"
                >
                  {fieldErrors.email}
                </span>
              )}
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                autoComplete={isSignUp ? "new-password" : "current-password"}
                name="password"
                placeholder={
                  isSignUp ? "At least 8 characters" : "Your password"
                }
                type="password"
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password && (
                <span
                  className={styles.fieldError}
                  id="password-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </span>
              )}
            </label>

            {errorMessage && (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className={styles.submitButton}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? isSignUp
                  ? "Creating your account..."
                  : "Signing you in..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
              {!isSubmitting && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          <p className={styles.switchMode}>
            {isSignUp ? "Already have an account?" : "New to Taskflow?"}{" "}
            <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
              {isSignUp ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className={styles.securityNote}>
            <span aria-hidden="true">⌑</span>
            Your work stays yours. Always encrypted and secure.
          </p>
        </section>
      </div>
    </main>
  );
}

function getFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "name" || field === "email" || field === "password") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
