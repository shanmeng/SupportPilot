import "server-only";
import { getDb } from "@/lib/db/client";
import { accounts, events, payments, webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import type { Environment } from "./scope";

type Nullable<T> = T | null;

/** Rows as they appear in the dataset's SQLite file (snake_case). `customers` and `event_journal` are never imported. */
export type BusinessData = {
  accounts: { account_id: string; name: string; production_status: string; current_plan: Nullable<string>; created_at: string }[];
  webhook_endpoints: {
    endpoint_id: string; account_id: string; environment: Environment; url_host: string; status: string;
    api_version: Nullable<string>; created_at: string; disabled_at: Nullable<string>;
  }[];
  payments: {
    payment_id: string; account_id: string; environment: Environment; amount: number; currency: string; status: string;
    api_version: Nullable<string>; failure_code: Nullable<string>; failure_category: Nullable<string>;
    created_at: string; updated_at: string; succeeded_at: Nullable<string>;
  }[];
  events: {
    event_id: string; account_id: string; environment: Environment; event_type: string; api_version: Nullable<string>;
    object_type: string; object_id: string; occurred_at: string;
  }[];
  webhook_deliveries: {
    delivery_id: string; event_id: string; endpoint_id: string; status: string; attempt_count: number;
    first_attempt_at: Nullable<string>; last_attempt_at: Nullable<string>; next_attempt_at: Nullable<string>;
    delivered_at: Nullable<string>; terminal_reason: Nullable<string>;
  }[];
};

export type BusinessImportSummary = Record<keyof BusinessData, number> & { skippedDeliveries: number };

const date = (value: Nullable<string>) => (value ? new Date(value) : null);
const BATCH = 1000;

async function insertBatches<T>(rows: T[], insert: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += BATCH) await insert(rows.slice(i, i + BATCH));
}

/**
 * Loads business records. Idempotent: existing IDs are left unchanged. A delivery is kept only if
 * its event and endpoint exist and belong to the same account and environment; its scope is copied
 * from the event.
 */
export async function importBusinessData(data: BusinessData): Promise<BusinessImportSummary> {
  const db = getDb();
  await insertBatches(data.accounts, (batch) =>
    db.insert(accounts).values(batch.map((r) => ({
      id: r.account_id, name: r.name, productionStatus: r.production_status, currentPlan: r.current_plan,
      createdAt: new Date(r.created_at),
    }))).onConflictDoNothing(),
  );
  await insertBatches(data.webhook_endpoints, (batch) =>
    db.insert(webhookEndpoints).values(batch.map((r) => ({
      id: r.endpoint_id, accountId: r.account_id, environment: r.environment, urlHost: r.url_host, status: r.status,
      apiVersion: r.api_version, createdAt: new Date(r.created_at), disabledAt: date(r.disabled_at),
    }))).onConflictDoNothing(),
  );
  await insertBatches(data.payments, (batch) =>
    db.insert(payments).values(batch.map((r) => ({
      id: r.payment_id, accountId: r.account_id, environment: r.environment, amount: r.amount, currency: r.currency,
      status: r.status, apiVersion: r.api_version, failureCode: r.failure_code, failureCategory: r.failure_category,
      createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at), succeededAt: date(r.succeeded_at),
    }))).onConflictDoNothing(),
  );
  await insertBatches(data.events, (batch) =>
    db.insert(events).values(batch.map((r) => ({
      id: r.event_id, accountId: r.account_id, environment: r.environment, eventType: r.event_type,
      apiVersion: r.api_version, objectType: r.object_type, objectId: r.object_id, occurredAt: new Date(r.occurred_at),
    }))).onConflictDoNothing(),
  );

  const eventScope = new Map(data.events.map((e) => [e.event_id, { accountId: e.account_id, environment: e.environment }]));
  const endpointScope = new Map(data.webhook_endpoints.map((e) => [e.endpoint_id, { accountId: e.account_id, environment: e.environment }]));
  const deliveries = data.webhook_deliveries.flatMap((r) => {
    const scope = eventScope.get(r.event_id);
    const endpoint = endpointScope.get(r.endpoint_id);
    if (!scope || !endpoint || scope.accountId !== endpoint.accountId || scope.environment !== endpoint.environment) return [];
    return [{
      id: r.delivery_id, eventId: r.event_id, endpointId: r.endpoint_id, accountId: scope.accountId,
      environment: scope.environment, status: r.status, attemptCount: r.attempt_count,
      firstAttemptAt: date(r.first_attempt_at), lastAttemptAt: date(r.last_attempt_at),
      nextAttemptAt: date(r.next_attempt_at), deliveredAt: date(r.delivered_at), terminalReason: r.terminal_reason,
    }];
  });
  await insertBatches(deliveries, (batch) => db.insert(webhookDeliveries).values(batch).onConflictDoNothing());

  return {
    accounts: data.accounts.length,
    webhook_endpoints: data.webhook_endpoints.length,
    payments: data.payments.length,
    events: data.events.length,
    webhook_deliveries: deliveries.length,
    skippedDeliveries: data.webhook_deliveries.length - deliveries.length,
  };
}
