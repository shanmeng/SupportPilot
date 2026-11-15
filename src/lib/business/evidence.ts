import type { DeliveryRecord, EventRecord, PaymentRecord } from "@/lib/db/business-repository";
import type { EvidenceSource } from "@/types/evidence";
import type { RecordScope } from "./scope";

const day = (iso: string) => iso.slice(0, 10);
const minute = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function formatAmount(minorUnits: number, currency: string): string {
  const major = (minorUnits / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${major} ${currency}`;
}

const detail = (kind: string, scope: RecordScope) => `${kind} · ${scope.accountId} · ${scope.environment}`;

/** Citation built only from stored record fields. */
export function paymentEvidence(payment: PaymentRecord, scope: RecordScope): EvidenceSource {
  const parts = [payment.status, formatAmount(payment.amount, payment.currency), `created ${day(payment.createdAt)}`];
  if (payment.failureCode) parts.push(`failure ${payment.failureCode}${payment.failureCategory ? ` (${payment.failureCategory})` : ""}`);
  return { id: payment.id, title: `Payment ${payment.id}`, excerpt: parts.join(" · "), kind: "record", detail: detail("Payment", scope) };
}

export function eventEvidence(event: EventRecord, scope: RecordScope): EvidenceSource {
  return {
    id: event.id,
    title: `Event ${event.id}`,
    excerpt: `${event.eventType} for ${event.objectId} · ${minute(event.occurredAt)}`,
    kind: "record",
    detail: detail("Event", scope),
  };
}

export function deliveryEvidence(delivery: DeliveryRecord, scope: RecordScope): EvidenceSource {
  const parts = [
    delivery.status,
    `${delivery.attemptCount} ${delivery.attemptCount === 1 ? "attempt" : "attempts"}`,
    `endpoint ${delivery.endpointId} (${delivery.endpointStatus}, ${delivery.endpointHost})`,
  ];
  if (delivery.deliveredAt) parts.push(`delivered ${minute(delivery.deliveredAt)}`);
  if (delivery.nextAttemptAt) parts.push(`next attempt ${minute(delivery.nextAttemptAt)}`);
  if (delivery.terminalReason) parts.push(`stopped: ${delivery.terminalReason}`);
  return { id: delivery.id, title: `Webhook delivery ${delivery.id}`, excerpt: parts.join(" · "), kind: "record", detail: detail("Webhook delivery", scope) };
}

export function endpointEvidence(delivery: DeliveryRecord, scope: RecordScope): EvidenceSource {
  return {
    id: delivery.endpointId,
    title: `Webhook endpoint ${delivery.endpointId}`,
    excerpt: `${delivery.endpointStatus} · ${delivery.endpointHost}`,
    kind: "record",
    detail: detail("Webhook endpoint", scope),
  };
}
