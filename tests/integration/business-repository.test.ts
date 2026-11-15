import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { importBusinessData } from "@/lib/business/importer";
import {
  getPayment,
  getWebhookEndpoint,
  listDeliveriesForPayment,
  listPaymentEvents,
} from "@/lib/db/business-repository";
import { getDb } from "@/lib/db/client";
import { businessFixtures, scopeA, scopeB } from "../support/business-fixtures";

beforeAll(async () => {
  await getDb().execute(sql`truncate table accounts cascade`);
  await importBusinessData(businessFixtures);
});

describe("scoped business records (real PostgreSQL)", () => {
  it("reads a payment inside the given account and environment", async () => {
    const payment = await getPayment(scopeA, "pay_test_a_0001");

    expect(payment).toMatchObject({ id: "pay_test_a_0001", status: "succeeded", amount: 357513, currency: "USD" });
  });

  describe("cross-account isolation", () => {
    it("does not return another account's payment", async () => {
      await expect(getPayment(scopeA, "pay_test_b_0001")).resolves.toBeNull();
    });

    it("does not return a payment from another environment of the same account", async () => {
      await expect(getPayment({ ...scopeA, environment: "sandbox" }, "pay_test_a_0001")).resolves.toBeNull();
    });

    it("does not return another account's events, even with a valid payment ID", async () => {
      await expect(listPaymentEvents(scopeA, "pay_test_b_0001")).resolves.toEqual([]);
    });

    it("does not return another account's webhook deliveries", async () => {
      await expect(listDeliveriesForPayment(scopeA, "pay_test_b_0001")).resolves.toEqual([]);
    });

    it("does not return another account's webhook endpoint", async () => {
      await expect(getWebhookEndpoint(scopeA, "we_test_b_01")).resolves.toBeNull();
    });
  });

  it("lists the events for a payment in scope", async () => {
    const events = await listPaymentEvents(scopeB, "pay_test_b_0001");

    expect(events).toEqual([
      expect.objectContaining({ id: "evt_test_b_0001", eventType: "payment.failed", objectId: "pay_test_b_0001" }),
    ]);
  });

  it("lists deliveries for a payment with their endpoint's status and host", async () => {
    const deliveries = await listDeliveriesForPayment(scopeB, "pay_test_b_0001");

    expect(deliveries).toEqual([
      expect.objectContaining({
        id: "del_test_b_0001",
        eventId: "evt_test_b_0001",
        status: "exhausted",
        attemptCount: 8,
        terminalReason: "retry_exhausted",
        endpointId: "we_test_b_01",
        endpointStatus: "disabled",
        endpointHost: "hooks.b.example.test",
      }),
    ]);
  });

  it("skips records whose account does not exist instead of failing the import", async () => {
    const orphan = { ...businessFixtures.payments[0], payment_id: "pay_orphan_0001", account_id: "acct_missing" };

    const summary = await importBusinessData({ ...businessFixtures, payments: [...businessFixtures.payments, orphan] });

    expect(summary.skippedRecords).toBe(1);
    await expect(getPayment({ accountId: "acct_missing", environment: "production" }, "pay_orphan_0001")).resolves.toBeNull();
  });

  it("imports events that have no object (for example invoice events) without breaking payment queries", async () => {
    const invoiceEvent = { ...businessFixtures.events[0], event_id: "evt_test_a_inv", object_type: "invoice", object_id: null };

    await importBusinessData({ ...businessFixtures, events: [...businessFixtures.events, invoiceEvent] });

    const [row] = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from events where id = 'evt_test_a_inv'`);
    expect(row.n).toBe(1);
    await expect(listPaymentEvents(scopeA, "pay_test_a_0001")).resolves.toHaveLength(1);
  });

  it("re-importing the same data does not duplicate rows", async () => {
    await importBusinessData(businessFixtures);

    const [row] = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from payments`);
    expect(row.n).toBe(2);
  });
});
