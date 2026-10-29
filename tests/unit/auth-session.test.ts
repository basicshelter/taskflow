import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifySession } from "@/lib/auth-session";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

beforeEach(() => {
  getSession.mockResolvedValue({
    user: { id: "user-1", name: "Alex", email: "alex@example.com" },
  });
});

describe("session verification", () => {
  it("redirects signed-out users to sign in", async () => {
    getSession.mockResolvedValue(null);

    await expect(verifySession()).rejects.toThrow("redirect:/sign-in");
  });

  it("returns the authenticated session", async () => {
    await expect(verifySession()).resolves.toMatchObject({
      user: { id: "user-1" },
    });
  });
});
