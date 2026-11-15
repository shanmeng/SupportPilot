/**
 * Prepares a disposable database for Playwright: applies migrations and loads the handwritten
 * synthetic fixtures (3 English documents, 2 accounts with one payment chain each).
 * Never uses the FlowPay dataset. Refuses to run without E2E_ALLOW_SEED=yes so it cannot be
 * pointed at a real database by accident.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { importBusinessData } from "@/lib/business/importer";
import { importKnowledgeFiles } from "@/lib/rag/importer";
import { businessFixtures } from "../tests/support/business-fixtures";
import { loadKnowledgeFixtures } from "../tests/support/knowledge-fixtures";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.E2E_ALLOW_SEED !== "yes") {
    console.error("Set DATABASE_URL to a disposable database and E2E_ALLOW_SEED=yes.");
    process.exit(2);
  }
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client`truncate table investigations, documents, accounts cascade`;
  await client.end();

  const docs = await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: null, force: true });
  const business = await importBusinessData(businessFixtures);
  console.log(`E2E seed: ${docs.imported.length} documents, ${business.payments} payments.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("E2E seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
