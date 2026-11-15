import { expect, test } from "@playwright/test";
import { ask, setScope, signInAs } from "./helpers";

test("investigating a payment shows its records as citations", async ({ page }) => {
  await signInAs(page, "e2e-engineer");
  await setScope(page, { accountId: "acct_test_a", environment: "production", paymentId: "pay_test_a_0001" });

  await ask(page, "Why was no webhook delivered?");

  const sources = page.getByRole("list", { name: "Evidence sources" });
  await expect(sources.getByText("pay_test_a_0001", { exact: true })).toBeVisible();
  await expect(sources.getByText("evt_test_a_0001", { exact: true })).toBeVisible();
  await expect(sources.getByText("del_test_a_0001", { exact: true })).toBeVisible();
  await expect(sources.getByText("Record").first()).toBeVisible();
});

test("a payment from another account is never shown (cross-account isolation)", async ({ page }) => {
  await signInAs(page, "e2e-engineer");
  await setScope(page, { accountId: "acct_test_b", environment: "production", paymentId: "pay_test_a_0001" });

  await ask(page, "What happened to this payment?");

  await expect(page.getByText("No verified sources")).toBeVisible();
  await expect(page.getByText("pay_test_a_0001", { exact: true })).toHaveCount(0);
});

test("a question naming a payment without a scope asks for the missing fields (Flow C)", async ({ page }) => {
  await signInAs(page, "e2e-engineer");

  await ask(page, "Why was pay_test_a_0001 not delivered?");

  await expect(page.getByText("Needs more information")).toBeVisible();
  await expect(page.getByText(/I need the account ID, environment, payment ID/)).toBeVisible();
});
