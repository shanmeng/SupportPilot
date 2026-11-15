import type { BusinessData } from "@/lib/business/importer";

/** Two synthetic accounts with one payment → event → delivery → endpoint chain each. */
export const businessFixtures: BusinessData = {
  accounts: [
    { account_id: "acct_test_a", name: "Account A", production_status: "active", current_plan: "growth", created_at: "2025-09-01T00:00:00.000Z" },
    { account_id: "acct_test_b", name: "Account B", production_status: "active", current_plan: "starter", created_at: "2025-09-01T00:00:00.000Z" },
  ],
  webhook_endpoints: [
    { endpoint_id: "we_test_a_01", account_id: "acct_test_a", environment: "production", url_host: "hooks.a.example.test", status: "enabled", api_version: "2025-10-01", created_at: "2025-09-01T00:00:00.000Z", disabled_at: null },
    { endpoint_id: "we_test_b_01", account_id: "acct_test_b", environment: "production", url_host: "hooks.b.example.test", status: "disabled", api_version: "2025-10-01", created_at: "2025-09-01T00:00:00.000Z", disabled_at: "2025-10-02T00:00:00.000Z" },
  ],
  payments: [
    { payment_id: "pay_test_a_0001", account_id: "acct_test_a", environment: "production", amount: 357513, currency: "USD", status: "succeeded", api_version: "2025-10-01", failure_code: null, failure_category: null, created_at: "2025-10-25T00:07:10.000Z", updated_at: "2025-10-25T00:07:10.000Z", succeeded_at: "2025-10-25T00:07:10.000Z" },
    { payment_id: "pay_test_b_0001", account_id: "acct_test_b", environment: "production", amount: 1200, currency: "USD", status: "failed", api_version: "2025-10-01", failure_code: "FP-4021", failure_category: "declined", created_at: "2025-10-26T00:00:00.000Z", updated_at: "2025-10-26T00:00:00.000Z", succeeded_at: null },
  ],
  events: [
    { event_id: "evt_test_a_0001", account_id: "acct_test_a", environment: "production", event_type: "payment.succeeded", api_version: "2025-10-01", object_type: "payment", object_id: "pay_test_a_0001", occurred_at: "2025-10-25T00:07:10.001Z" },
    { event_id: "evt_test_b_0001", account_id: "acct_test_b", environment: "production", event_type: "payment.failed", api_version: "2025-10-01", object_type: "payment", object_id: "pay_test_b_0001", occurred_at: "2025-10-26T00:00:00.001Z" },
  ],
  webhook_deliveries: [
    { delivery_id: "del_test_a_0001", event_id: "evt_test_a_0001", endpoint_id: "we_test_a_01", status: "retrying", attempt_count: 1, first_attempt_at: "2025-10-25T00:07:10.004Z", last_attempt_at: "2025-10-25T00:07:10.004Z", next_attempt_at: "2025-10-25T00:08:10.004Z", delivered_at: null, terminal_reason: null },
    { delivery_id: "del_test_b_0001", event_id: "evt_test_b_0001", endpoint_id: "we_test_b_01", status: "exhausted", attempt_count: 8, first_attempt_at: "2025-10-26T00:00:00.004Z", last_attempt_at: "2025-10-29T00:00:00.000Z", next_attempt_at: null, delivered_at: null, terminal_reason: "retry_exhausted" },
  ],
};

export const scopeA = { accountId: "acct_test_a", environment: "production" as const };
export const scopeB = { accountId: "acct_test_b", environment: "production" as const };
