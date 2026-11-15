import "server-only";
import type { RecordScope } from "@/lib/business/scope";
import { getPayment, listDeliveriesForPayment, listPaymentEvents } from "@/lib/db/business-repository";
import type { BusinessTools } from "./investigation-agent";

/** Binds the read-only business queries to one account + environment chosen by the engineer, not the model. */
export function createBusinessTools(scope: RecordScope): BusinessTools {
  return {
    getPayment: (paymentId) => getPayment(scope, paymentId),
    listPaymentEvents: (paymentId) => listPaymentEvents(scope, paymentId),
    listWebhookDeliveries: (paymentId) => listDeliveriesForPayment(scope, paymentId),
  };
}
