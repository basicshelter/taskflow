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
import { ProjectCreateForm } from "@/components/project-create-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function renderProjectCreateForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectCreateForm workspaceId="workspace-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectCreateForm", () => {
  it("creates a project with Axios and refreshes the workspace", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 201 });
    renderProjectCreateForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Website redesign" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/workspaces/workspace-1/projects",
        { name: "Website redesign" },
        { validateStatus: expect.any(Function) },
      );
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows a permission error when the user cannot create projects", async () => {
    vi.mocked(axios.post).mockResolvedValue({ status: 403 });
    renderProjectCreateForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Website redesign" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Only workspace owners and admins can create projects.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
