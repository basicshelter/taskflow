import { expect, test } from "@playwright/test";

test("validates sign-up fields in the browser without sending a request", async ({
  page,
}) => {
  let requestCount = 0;
  await page.route("**/api/auth/**", async (route) => {
    requestCount += 1;
    await route.fulfill({ status: 500 });
  });

  await page.goto("/?story=auth/sign-up");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your name" }).fill("A");
  await page.getByRole("textbox", { name: "Email address" }).fill("invalid");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("Your name must be at least 2 characters."),
  ).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(
    page.getByText("Your password must be at least 8 characters."),
  ).toBeVisible();
  expect(requestCount).toBe(0);
});

test("validates sign-in fields in the browser without sending a request", async ({
  page,
}) => {
  let requestCount = 0;
  await page.route("**/api/auth/**", async (route) => {
    requestCount += 1;
    await route.fulfill({ status: 500 });
  });

  await page.goto("/?story=auth/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill("invalid");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  expect(requestCount).toBe(0);
});

test("submits valid sign-in credentials and navigates to the home page", async ({
  page,
}) => {
  let submittedCredentials: unknown;
  await page.route("**/api/auth/sign-in/email", async (route) => {
    submittedCredentials = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: {
        token: "test-session",
        user: {
          id: "user-1",
          name: "Alex Morgan",
          email: "alex@example.com",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });

  await page.goto("/?story=auth/sign-in");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("alex@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByTestId("router-replace")).toHaveText("/");
  await expect(page.getByTestId("router-refresh")).toHaveText("1");
  expect(submittedCredentials).toEqual({
    email: "alex@example.com",
    password: "password123",
  });
});

test("submits valid sign-up data and navigates to the home page", async ({
  page,
}) => {
  let submittedCredentials: unknown;
  await page.route("**/api/auth/sign-up/email", async (route) => {
    submittedCredentials = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      json: {
        token: "test-session",
        user: {
          id: "user-1",
          name: "Alex Morgan",
          email: "alex@example.com",
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });

  await page.goto("/?story=auth/sign-up");
  await page.getByRole("textbox", { name: "Your name" }).fill("Alex Morgan");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("alex@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByTestId("router-replace")).toHaveText("/");
  await expect(page.getByTestId("router-refresh")).toHaveText("1");
  expect(submittedCredentials).toEqual({
    name: "Alex Morgan",
    email: "alex@example.com",
    password: "password123",
  });
});
