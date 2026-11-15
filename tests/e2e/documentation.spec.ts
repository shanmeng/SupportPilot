import { expect, test } from "@playwright/test";
import { ask, signInAs } from "./helpers";

test("a documentation question shows citation cards with real IDs, and a card can be inspected", async ({ page }) => {
  await signInAs(page, "e2e-engineer");

  await page.getByRole("button", { name: "Ask: What happens after a webhook endpoint returns HTTP 410?" }).click();

  const sources = page.getByRole("list", { name: "Evidence sources" });
  await expect(sources.getByText("KB-FIX-001")).toBeVisible();
  await expect(sources.getByText("Webhook Delivery Retries")).toBeVisible();

  await page.getByRole("button", { name: /View document Webhook Delivery Retries \(KB-FIX-001\)/ }).click();
  const panel = page.getByRole("complementary", { name: "Selected evidence" });
  await expect(panel.getByText("KB-FIX-001")).toBeVisible();
});

test("an unrelated question shows 'No verified sources' and no invented citations", async ({ page }) => {
  await signInAs(page, "e2e-engineer");

  await ask(page, "chocolate cake recipe");

  await expect(page.getByText("No verified sources")).toBeVisible();
  await expect(page.getByRole("list", { name: "Evidence sources" })).toHaveCount(0);
});
