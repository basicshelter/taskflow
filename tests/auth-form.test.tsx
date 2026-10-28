import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "@/app/(auth)/sign-in/page";
import SignUpPage from "@/app/(auth)/sign-up/page";
import { AuthForm } from "@/components/auth-form";
import { authClient } from "@/lib/auth-client";
import { signInSchema, signUpSchema } from "@/lib/auth-validation";

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}));

describe("auth validation schemas", () => {
  it("accepts valid sign-in credentials", () => {
    expect(
      signInSchema.safeParse({
        email: "person@example.com",
        password: "pass",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed sign-in emails and empty passwords", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "" }).success,
    ).toBe(false);
  });

  it("trims sign-up names and emails and requires an eight-character password", () => {
    const result = signUpSchema.safeParse({
      name: "  Alex Morgan  ",
      email: "  alex@example.com ",
      password: "password",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Alex Morgan",
        email: "alex@example.com",
        password: "password",
      });
    }
    expect(
      signUpSchema.safeParse({
        name: "A",
        email: "alex@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("AuthForm", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ error: null });
    vi.mocked(authClient.signUp.email).mockResolvedValue({ error: null });
  });

  it("renders the sign-in page", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("renders the sign-up page", () => {
    render(<SignUpPage />);

    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
  });

  it("shows sign-up validation errors and does not call Better Auth", async () => {
    render(<AuthForm mode="sign-up" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Your name must be at least 2 characters."),
    ).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Your password must be at least 8 characters."),
    ).toBeTruthy();
    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  it("shows sign-in validation errors and does not call Better Auth", async () => {
    render(<AuthForm mode="sign-in" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it("submits valid sign-up data and navigates to the home page", async () => {
    render(<AuthForm mode="sign-up" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), {
      target: { value: "Alex Morgan" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        name: "Alex Morgan",
        email: "alex@example.com",
        password: "password123",
      });
      expect(replace).toHaveBeenCalledWith("/");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("submits valid sign-in data and navigates to the home page", async () => {
    render(<AuthForm mode="sign-in" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: "alex@example.com",
        password: "password123",
      });
      expect(replace).toHaveBeenCalledWith("/");
      expect(refresh).toHaveBeenCalled();
    });
  });
});
