import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/auth-validation";

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
