import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProjectSettings } from "@/components/project-settings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderProjectSettings(isArchived = false) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ProjectSettings
        isArchived={isArchived}
        projectDescription="Company site"
        projectId="project-1"
        projectName="Website"
      />
    </QueryClientProvider>,
  );
}

describe("project settings dialog", () => {
  it("provides project metadata controls and an archive confirmation", () => {
    const markup = renderProjectSettings();

    expect(markup).toContain('aria-label="Manage project Website"');
    expect(markup).toContain("Website settings");
    expect(markup).toContain("<label>Project name");
    expect(markup).toContain("<label>Description");
    expect(markup).toContain("Save changes");
    expect(markup).toContain("Archive project?");
    expect(markup).toContain("Cancel");
  });

  it("keeps archived project details read-only", () => {
    const markup = renderProjectSettings(true);

    expect(markup).toContain("This project is archived and read-only.");
    expect(markup).not.toContain("Archive project?");
    expect(markup).not.toContain("Save changes");
  });
});
