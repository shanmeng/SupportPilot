import { describe, expect, it } from "vitest";
import { mentionsRecordId, missingScopeFields, scopeInputSchema } from "@/lib/business/scope";

describe("scopeInputSchema", () => {
  it("accepts a well-formed account ID, environment and payment ID", () => {
    expect(
      scopeInputSchema.parse({ accountId: "acct_bg_001", environment: "production", paymentId: "pay_bg_001_0003" }),
    ).toEqual({ accountId: "acct_bg_001", environment: "production", paymentId: "pay_bg_001_0003" });
  });

  it("allows fields to be missing so the user can be asked for them", () => {
    expect(scopeInputSchema.parse({ accountId: "acct_bg_001" })).toEqual({ accountId: "acct_bg_001" });
  });

  it.each([
    [{ accountId: "acct_bg_001'; drop table payments;--" }, "accountId"],
    [{ environment: "staging" }, "environment"],
    [{ paymentId: "evt_bg_001_0003" }, "paymentId"],
  ])("rejects malformed scope %j", (input, field) => {
    const result = scopeInputSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });
});

describe("missingScopeFields", () => {
  it("lists every missing field in a fixed order", () => {
    expect(missingScopeFields({})).toEqual(["account ID", "environment", "payment ID"]);
    expect(missingScopeFields({ accountId: "acct_x" })).toEqual(["environment", "payment ID"]);
    expect(missingScopeFields({ accountId: "acct_x", environment: "sandbox", paymentId: "pay_x" })).toEqual([]);
  });
});

describe("mentionsRecordId", () => {
  it("detects payment, event, delivery, endpoint and account IDs in a question", () => {
    expect(mentionsRecordId("Why did pay_bg_001_0003 not notify us?")).toBe(true);
    expect(mentionsRecordId("Check del_bg_001_0003")).toBe(true);
    expect(mentionsRecordId("What happens after HTTP 410?")).toBe(false);
  });
});
