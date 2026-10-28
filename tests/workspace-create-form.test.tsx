import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function renderWorkspaceCreateForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceCreateForm />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspaceCreateForm", () => {
  it("creates a workspace and navigates to the workspace list", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 201 });
    renderWorkspaceCreateForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Workspace name" }), {
      target: { value: "Team North" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/workspaces",
        { name: "Team North" },
        { validateStatus: expect.any(Function) },
      );
      expect(replace).toHaveBeenCalledWith("/workspaces");
    });
  });

  it("shows a sign-in error when the user session has expired", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 401 });
    renderWorkspaceCreateForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Workspace name" }), {
      target: { value: "Team North" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Please sign in again to create a workspace.",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
