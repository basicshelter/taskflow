import { expect, test } from "@playwright/test";

test("creates a workspace and navigates to the workspace list", async ({
  page,
}) => {
  let submittedName: unknown;
  await page.route("**/api/v1/workspaces", async (route) => {
    submittedName = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: "workspace-1" } });
  });

  await page.goto("/?story=workspace/create");
  await page
    .getByRole("textbox", { name: "Workspace name" })
    .fill("Team North");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page.getByTestId("router-replace")).toHaveText("/workspaces");
  expect(submittedName).toEqual({ name: "Team North" });
});

test("shows the expired-session error when workspace creation is unauthorized", async ({
  page,
}) => {
  await page.route("**/api/v1/workspaces", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });

  await page.goto("/?story=workspace/create");
  await page
    .getByRole("textbox", { name: "Workspace name" })
    .fill("Team North");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(
    page.getByText("Please sign in again to create a workspace."),
  ).toBeVisible();
  await expect(page.getByTestId("router-replace")).toBeEmpty();
});

test("creates a project and refreshes the workspace", async ({ page }) => {
  let submittedProject: unknown;
  await page.route(
    "**/api/v1/workspaces/workspace-1/projects",
    async (route) => {
      submittedProject = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { id: "project-1" } });
    },
  );

  await page.goto("/?story=project/create");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Website redesign");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByTestId("router-refresh")).toHaveText("1");
  expect(submittedProject).toEqual({ name: "Website redesign" });
});

test("shows a permission error when project creation is forbidden", async ({
  page,
}) => {
  await page.route(
    "**/api/v1/workspaces/workspace-1/projects",
    async (route) => {
      await route.fulfill({ status: 403, json: { error: "Forbidden" } });
    },
  );

  await page.goto("/?story=project/create");
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Website redesign");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(
    page.getByText("Only workspace owners and admins can create projects."),
  ).toBeVisible();
  await expect(page.getByTestId("router-refresh")).toHaveText("0");
});
