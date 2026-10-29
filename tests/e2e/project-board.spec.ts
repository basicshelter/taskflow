import { expect, test } from "@playwright/test";

test("groups tasks into their status columns and collapses the project header", async ({
  page,
}) => {
  await page.goto("/?story=project/board");

  const columns = [
    ["To do", "Write copy"],
    ["In progress", "Build layout"],
    ["In review", "Review design"],
    ["Done", "Publish site"],
  ];

  for (const [status, task] of columns) {
    const column = page.getByRole("region", { name: status });
    await expect(column.getByRole("heading", { name: status })).toBeVisible();
    await expect(column.getByRole("heading", { name: task })).toBeVisible();
  }

  await page.getByRole("button", { name: "Collapse header" }).click();
  await expect(page.getByRole("button", { name: "Show header" })).toBeVisible();
  await page.getByRole("button", { name: "Show header" }).click();
  await expect(
    page.getByRole("button", { name: "Collapse header" }),
  ).toBeVisible();
});

test("moves an overflowing workspace title into the compact top bar", async ({
  page,
}) => {
  await page.goto("/?story=workspace/adaptive-list");
  await page.setViewportSize({ width: 1280, height: 300 });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));

  const topBar = page.locator("header");
  await expect(topBar.getByText("All workspaces")).toBeVisible();
  await expect(topBar.getByText("Design")).toBeVisible();
});
