import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDetailsPage from "@/app/(app)/projects/[projectId]/page";

const { verifySession, getProjectDetails } = vi.hoisted(() => ({
  verifySession: vi.fn(),
  getProjectDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("forbidden");
  },
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/lib/auth-session", () => ({
  verifySession,
}));

vi.mock("@/lib/controllers/project.controller", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/controllers/project.controller")>();

  return {
    ...actual,
    getProjectDetails,
  };
});

const projectId = "00000000-0000-4000-8000-000000000002";

afterEach(cleanup);

beforeEach(() => {
  verifySession.mockResolvedValue({
    user: { id: "user-1", name: "Alex", email: "alex@example.com" },
  });
  getProjectDetails.mockResolvedValue({
    kind: "found",
    project: {
      id: projectId,
      name: "Website",
      description: "Redesign the company website.",
      tasks: [
        { id: "task-1", title: "Write copy", status: "TODO" },
        { id: "task-2", title: "Build layout", status: "IN_PROGRESS" },
        { id: "task-3", title: "Review design", status: "IN_REVIEW" },
        { id: "task-4", title: "Publish site", status: "DONE" },
      ],
    },
  });
});

describe("project details access", () => {
  it("denies project access to users without workspace membership", async () => {
    getProjectDetails.mockResolvedValue({ kind: "membership_required" });

    await expect(
      ProjectDetailsPage({
        params: Promise.resolve({ projectId }),
      }),
    ).rejects.toThrow("forbidden");
  });

  it("rejects malformed IDs without loading project details", async () => {
    await expect(
      ProjectDetailsPage({
        params: Promise.resolve({ projectId: "invalid" }),
      }),
    ).rejects.toThrow("notFound");

    expect(getProjectDetails).not.toHaveBeenCalled();
  });

  it("renders a column for each status and groups its tasks correctly", async () => {
    const page = await ProjectDetailsPage({
      params: Promise.resolve({ projectId }),
    });

    render(page);

    expect(
      within(screen.getAllByRole("banner")[0]).getByText("PROJECT"),
    ).toBeTruthy();
    const columns = [
      ["To do", "Write copy"],
      ["In progress", "Build layout"],
      ["In review", "Review design"],
      ["Done", "Publish site"],
    ];

    for (const [status, task] of columns) {
      const column = screen.getByRole("region", { name: status });
      expect(within(column).getByText(task)).toBeTruthy();
    }

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Website" })).toBeTruthy();
  });

  it("collapses and expands the project header", async () => {
    const page = await ProjectDetailsPage({
      params: Promise.resolve({ projectId }),
    });

    render(page);

    fireEvent.click(screen.getByRole("button", { name: "Collapse header" }));

    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show header" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Collapse header" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show header" }));

    expect(
      screen.getByRole("button", { name: "Collapse header" }),
    ).toBeTruthy();
  });
});
