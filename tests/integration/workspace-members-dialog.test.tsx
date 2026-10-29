import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceMembers } from "@/components/workspace-members";

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

function renderWorkspaceMembers(currentUserRole: "OWNER" | "MEMBER") {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <WorkspaceMembers
        currentUserRole={currentUserRole}
        members={members}
        workspaceId="workspace-1"
        workspaceName="Design"
      />
    </QueryClientProvider>,
  );
}

describe("workspace member dialog", () => {
  it("provides an accessible people button and a closed dialog with member details", () => {
    const markup = renderWorkspaceMembers("OWNER");

    expect(markup).toContain('aria-label="View members of Design"');
    expect(markup).toContain("<dialog");
    expect(markup).toContain("Design&#x27;s Members");
    expect(markup).toContain("alex@example.com");
    expect(markup).toContain("sam@example.com");
    expect(markup).toContain("Transfer ownership");
  });

  it("shows members read-only for a regular workspace member", () => {
    const markup = renderWorkspaceMembers("MEMBER");

    expect(markup).toContain("alex@example.com");
    expect(markup).toContain("sam@example.com");
    expect(markup).not.toContain("Invite a registered user");
    expect(markup).not.toContain("Transfer ownership");
    expect(markup).not.toContain("Remove");
  });
});
