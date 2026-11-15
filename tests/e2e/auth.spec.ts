import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("signed-out visitors are sent to sign-in and the API refuses them", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole("heading", { name: "Sign in to SupportPilot" })).toBeVisible();

  expect((await request.get("/api/v1/me")).status()).toBe(401);
});

test("an engineer signs in with the test login and signs out", async ({ page }) => {
  await signInAs(page, "e2e-engineer");
  await expect(page.getByText("Engineer", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment Investigation" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/signin$/);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});

test("the lead test user gets the lead role", async ({ page }) => {
  await signInAs(page, "e2e-lead");
  await expect(page.getByText("Lead", { exact: true })).toBeVisible();
});
