/**
 * Imports synthetic FlowPay business records (accounts, webhook endpoints, payments, events,
 * webhook deliveries) from the dataset's SQLite file into PostgreSQL.
 *
 *   npm run db:import-business                  # reads $FLOWPAY_SQLITE_PATH
 *   npm run db:import-business -- <flowpay.sqlite>
 *
 * Only the tables above are read. customers (emails), event_journal (audit journal) and the
 * benchmark are never imported. The dataset itself is never committed.
 */
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { importBusinessData, type BusinessData } from "@/lib/business/importer";

const QUERIES: Record<keyof BusinessData, string> = {
  accounts: "select account_id, name, production_status, current_plan, created_at from accounts",
  webhook_endpoints:
    "select endpoint_id, account_id, environment, url_host, status, api_version, created_at, disabled_at from webhook_endpoints",
  payments:
    "select payment_id, account_id, environment, amount, currency, status, api_version, failure_code, failure_category, created_at, updated_at, succeeded_at from payments",
  events: "select event_id, account_id, environment, event_type, api_version, object_type, object_id, occurred_at from events",
  webhook_deliveries:
    "select delivery_id, event_id, endpoint_id, status, attempt_count, first_attempt_at, last_attempt_at, next_attempt_at, delivered_at, terminal_reason from webhook_deliveries",
};

async function main() {
  const path = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? process.env.FLOWPAY_SQLITE_PATH;
  if (!path || !existsSync(path)) {
    console.error("Pass the path to flowpay.sqlite or set FLOWPAY_SQLITE_PATH.");
    process.exit(2);
  }
  const sqlite = new DatabaseSync(path, { readOnly: true });
  const data = Object.fromEntries(
    Object.entries(QUERIES).map(([table, query]) => [table, sqlite.prepare(query).all()]),
  ) as unknown as BusinessData;
  sqlite.close();

  console.log(`Importing from ${path} …`);
  const summary = await importBusinessData(data);
  console.log(
    `Accounts ${summary.accounts}, endpoints ${summary.webhook_endpoints}, payments ${summary.payments}, events ${summary.events}, deliveries ${summary.webhook_deliveries}. Skipped: ${summary.skippedRecords} records of unknown accounts, ${summary.skippedDeliveries} inconsistent deliveries.`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  // Drizzle's message includes the whole statement and parameters; print only the database's reason.
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
  console.error("Import failed:", (cause ?? (error instanceof Error ? error.message : String(error))).slice(0, 300));
  process.exit(1);
});
