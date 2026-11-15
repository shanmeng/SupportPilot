import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { RecordScope } from "@/lib/business/scope";
import { getDb } from "./client";
import { events, payments, webhookDeliveries, webhookEndpoints } from "./schema";

/**
 * Read-only, allowlisted queries over business records. Every query requires a scope and filters
 * on BOTH account_id and environment; there is no way to query across accounts.
 */

export type PaymentRecord = {
  id: string; status: string; amount: number; currency: string; failureCode: string | null;
  failureCategory: string | null; createdAt: string; succeededAt: string | null;
};
export type EventRecord = { id: string; eventType: string; objectId: string | null; occurredAt: string };
export type DeliveryRecord = {
  id: string; eventId: string; status: string; attemptCount: number; lastAttemptAt: string | null;
  nextAttemptAt: string | null; deliveredAt: string | null; terminalReason: string | null;
  endpointId: string; endpointStatus: string; endpointHost: string;
};
export type EndpointRecord = { id: string; status: string; urlHost: string; disabledAt: string | null };

const MAX_EVENTS = 20;
const MAX_DELIVERIES = 20;
const iso = (value: Date | null) => (value ? value.toISOString() : null);

export async function getPayment(scope: RecordScope, paymentId: string): Promise<PaymentRecord | null> {
  const [row] = await getDb()
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.accountId, scope.accountId), eq(payments.environment, scope.environment)));
  if (!row) return null;
  return {
    id: row.id, status: row.status, amount: row.amount, currency: row.currency, failureCode: row.failureCode,
    failureCategory: row.failureCategory, createdAt: row.createdAt.toISOString(), succeededAt: iso(row.succeededAt),
  };
}

export async function listPaymentEvents(scope: RecordScope, paymentId: string): Promise<EventRecord[]> {
  const rows = await getDb()
    .select({ id: events.id, eventType: events.eventType, objectId: events.objectId, occurredAt: events.occurredAt })
    .from(events)
    .where(and(eq(events.objectId, paymentId), eq(events.accountId, scope.accountId), eq(events.environment, scope.environment)))
    .orderBy(asc(events.occurredAt))
    .limit(MAX_EVENTS);
  return rows.map((row) => ({ ...row, occurredAt: row.occurredAt.toISOString() }));
}

export async function listDeliveriesForPayment(scope: RecordScope, paymentId: string): Promise<DeliveryRecord[]> {
  const rows = await getDb()
    .select({
      id: webhookDeliveries.id, eventId: webhookDeliveries.eventId, status: webhookDeliveries.status,
      attemptCount: webhookDeliveries.attemptCount, lastAttemptAt: webhookDeliveries.lastAttemptAt,
      nextAttemptAt: webhookDeliveries.nextAttemptAt, deliveredAt: webhookDeliveries.deliveredAt,
      terminalReason: webhookDeliveries.terminalReason, endpointId: webhookEndpoints.id,
      endpointStatus: webhookEndpoints.status, endpointHost: webhookEndpoints.urlHost,
    })
    .from(webhookDeliveries)
    .innerJoin(events, eq(events.id, webhookDeliveries.eventId))
    .innerJoin(webhookEndpoints, eq(webhookEndpoints.id, webhookDeliveries.endpointId))
    .where(
      and(
        eq(events.objectId, paymentId),
        eq(webhookDeliveries.accountId, scope.accountId),
        eq(webhookDeliveries.environment, scope.environment),
        eq(events.accountId, scope.accountId),
        eq(webhookEndpoints.accountId, scope.accountId),
      ),
    )
    .orderBy(asc(webhookDeliveries.firstAttemptAt))
    .limit(MAX_DELIVERIES);
  return rows.map((row) => ({
    ...row, lastAttemptAt: iso(row.lastAttemptAt), nextAttemptAt: iso(row.nextAttemptAt), deliveredAt: iso(row.deliveredAt),
  }));
}

export async function getWebhookEndpoint(scope: RecordScope, endpointId: string): Promise<EndpointRecord | null> {
  const [row] = await getDb()
    .select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.accountId, scope.accountId), eq(webhookEndpoints.environment, scope.environment)));
  return row ? { id: row.id, status: row.status, urlHost: row.urlHost, disabledAt: iso(row.disabledAt) } : null;
}
