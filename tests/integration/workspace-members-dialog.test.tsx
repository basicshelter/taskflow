import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceSettings } from "@/components/workspace-settings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const members = [
  {
    userId: "owner-1",
    name: "Alex",
    email: "alex@example.com",
    role: "OWNER" as const,
  },
  {
    userId: "member-1",
    name: "Sam",
    email: "sam@example.com",
    role: "MEMBER" as const,
  },
];

function renderWorkspaceSettings(
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER",
) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <WorkspaceSettings
        currentUserRole={currentUserRole}
        members={members}
        workspaceId="workspace-1"
        workspaceName="Design"
      />
    </QueryClientProvider>,
  );
}

describe("workspace member dialog", () => {
  it("provides an accessible settings button and ordered workspace controls", () => {
    const markup = renderWorkspaceSettings("OWNER");

    expect(markup).toContain('aria-label="Manage workspace Design"');
    expect(markup).toContain("<dialog");
    expect(markup).toContain("Design settings");
    expect(markup).toContain("alex@example.com");
    expect(markup).toContain("sam@example.com");
    expect(markup).toContain("Transfer ownership");
    expect(markup).toContain("Rename workspace");
    expect(markup).toContain(">Members</h3>");
    expect(markup).toContain(">2 members</span>");
    expect(markup).toContain("Delete workspace");
    expect(markup).toContain("This action cannot be undone.");
    expect(markup.indexOf("Rename workspace")).toBeLessThan(
      markup.indexOf(">Members</h3>"),
    );
    expect(markup.indexOf(">Members</h3>")).toBeLessThan(
      markup.indexOf(">2 members</span>"),
    );
    expect(markup.indexOf(">2 members</span>")).toBeLessThan(
      markup.indexOf("Delete workspace"),
    );
  });

  it("provides workspace actions to admins", () => {
    const markup = renderWorkspaceSettings("ADMIN");

    expect(markup).toContain("Rename workspace");
    expect(markup).not.toContain("Delete workspace");
    expect(markup).not.toContain("Delete workspace?");
    expect(markup).not.toContain("Transfer ownership");
  });

  it("shows members read-only for a regular workspace member", () => {
    const markup = renderWorkspaceSettings("MEMBER");

    expect(markup).toContain("alex@example.com");
    expect(markup).toContain("sam@example.com");
    expect(markup).not.toContain("Invite a registered user");
    expect(markup).not.toContain("Transfer ownership");
    expect(markup).not.toContain("Remove");
    expect(markup).not.toContain("Rename workspace");
    expect(markup).not.toContain("Delete workspace");
  });
});
