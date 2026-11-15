import { expect, test } from "@playwright/test";
import { ask, signInAs } from "./helpers";

test("answers are saved, survive a reload and can be reopened", async ({ page }) => {
  await signInAs(page, "e2e-engineer");
  const question = `Webhook retry policy ${Date.now()}`;

  await ask(page, question);
  await expect(page.getByRole("list", { name: "Evidence sources" })).toBeVisible();

  await page.reload();
  const openCase = page.getByRole("button", { name: `Open case: ${question}` });
  await expect(openCase).toBeVisible();
  await openCase.click();
  await expect(page.getByRole("list", { name: "Conversation" }).getByText(question)).toBeVisible();
});

test("engineers cannot open a lead's case, but leads can open an engineer's", async ({ browser }) => {
  const leadPage = await (await browser.newContext()).newPage();
  await signInAs(leadPage, "e2e-lead");
  const leadAnswer = await (
    await leadPage.request.post("/api/v1/answers", { data: { question: "Lead's private webhook question" } })
  ).json();

  const engineerPage = await (await browser.newContext()).newPage();
  await signInAs(engineerPage, "e2e-engineer");
  const engineerAnswer = await (
    await engineerPage.request.post("/api/v1/answers", { data: { question: "Engineer's webhook question" } })
  ).json();

  expect((await engineerPage.request.get(`/api/v1/investigations/${leadAnswer.investigationId}`)).status()).toBe(404);

  const asLead = await leadPage.request.get(`/api/v1/investigations/${engineerAnswer.investigationId}`);
  expect(asLead.status()).toBe(200);
  expect((await asLead.json()).ownerName).toBe("E2E Engineer");
});
