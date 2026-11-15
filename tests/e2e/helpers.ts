import { expect, type Page } from "@playwright/test";

export async function signInAs(page: Page, user: "e2e-engineer" | "e2e-lead") {
  await page.goto("/signin");
  await page.getByRole("button", { name: `Sign in as test user: ${user}` }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function ask(page: Page, question: string) {
  const composer = page.getByRole("textbox", { name: "Ask a question" });
  await composer.fill(question);
  await composer.press("Enter");
}

export async function setScope(page: Page, scope: { accountId?: string; environment?: string; paymentId?: string }) {
  const toggle = page.getByRole("button", { name: "Investigate a payment" });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  if (scope.accountId !== undefined) await page.getByLabel("Account ID").fill(scope.accountId);
  if (scope.environment !== undefined) await page.getByLabel("Environment").selectOption(scope.environment);
  if (scope.paymentId !== undefined) await page.getByLabel("Payment ID").fill(scope.paymentId);
}
