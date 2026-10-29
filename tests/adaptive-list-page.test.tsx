import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdaptiveListPage } from "@/components/adaptive-list-page";

describe("adaptive list page", () => {
  it("moves the page title into the top bar when the page overflows", async () => {
    render(
      <AdaptiveListPage
        compactBackHref="/workspaces"
        compactBackLabel="All workspaces"
        context="WORKSPACE"
        pageTitle="Design"
        userName="Alex"
      >
        <section>
          <h1>Design</h1>
          <ul>
            <li>Many projects</li>
          </ul>
        </section>
      </AdaptiveListPage>,
    );

    Object.defineProperty(screen.getByRole("main"), "scrollHeight", {
      configurable: true,
      value: window.innerHeight + 1,
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      const topBar = screen.getByRole("banner");
      expect(within(topBar).getByText("All workspaces")).toBeTruthy();
      expect(within(topBar).getByText("Design")).toBeTruthy();
    });
  });
});
