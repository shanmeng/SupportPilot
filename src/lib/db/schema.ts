import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { environments } from "@/lib/business/scope";
import { EMBEDDING_DIMENSIONS } from "@/lib/rag/embedder";
import { documentAuthorities, documentKinds } from "@/lib/rag/knowledge-document";

export const userRole = pgEnum("user_role", ["engineer", "lead"]);

/** Support engineers who sign in with GitHub OAuth. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  login: text("login").notNull(),
  name: text("name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  role: userRole("role").notNull().default("engineer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const documentKind = pgEnum("document_kind", documentKinds);
export const documentAuthority = pgEnum("document_authority", documentAuthorities);

/** Knowledge-base documents. `id` is the dataset's own doc_id (e.g. KB-API-029), never generated. */
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  kind: documentKind("kind").notNull(),
  authority: documentAuthority("authority").notNull(),
  language: text("language").notNull(),
  productAreas: text("product_areas").array().notNull().default(sql`'{}'::text[]`),
  ruleIds: text("rule_ids").array().notNull().default(sql`'{}'::text[]`),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  sourcePath: text("source_path").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Retrieval chunks. `id` is `<doc_id>#c<NNN>`. `embedding` is optional so keyword search works
 * without an embedding provider; `search_vector` is maintained by PostgreSQL.
 */
export const documentChunks = pgTable(
  "document_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    section: text("section").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    embeddingModel: text("embedding_model"),
    searchVector: tsvector("search_vector")
      .notNull()
      .generatedAlwaysAs(
        sql`setweight(to_tsvector('english', coalesce(section, '')), 'A') || setweight(to_tsvector('english', content), 'B')`,
      ),
  },
  (table) => [
    // Also serves lookups by document_id (leading column).
    unique("document_chunks_document_index_unique").on(table.documentId, table.chunkIndex),
    index("document_chunks_search_vector_idx").using("gin", table.searchVector),
    index("document_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentChunkRow = typeof documentChunks.$inferSelect;

// ---------------------------------------------------------------------------
// Synthetic FlowPay business records (read-only for the app; loaded by the importer).
// Every record carries account_id + environment so queries can always be scoped.

export const environment = pgEnum("environment", environments);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  productionStatus: text("production_status").notNull(),
  currentPlan: text("current_plan"),
  createdAt: ts("created_at").notNull(),
});

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    environment: environment("environment").notNull(),
    urlHost: text("url_host").notNull(),
    status: text("status").notNull(),
    apiVersion: text("api_version"),
    createdAt: ts("created_at").notNull(),
    disabledAt: ts("disabled_at"),
  },
  (table) => [index("webhook_endpoints_scope_idx").on(table.accountId, table.environment)],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    environment: environment("environment").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    apiVersion: text("api_version"),
    failureCode: text("failure_code"),
    failureCategory: text("failure_category"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    succeededAt: ts("succeeded_at"),
  },
  (table) => [index("payments_scope_idx").on(table.accountId, table.environment)],
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    environment: environment("environment").notNull(),
    eventType: text("event_type").notNull(),
    apiVersion: text("api_version"),
    objectType: text("object_type").notNull(),
    objectId: text("object_id"),
    occurredAt: ts("occurred_at").notNull(),
  },
  (table) => [index("events_scope_object_idx").on(table.accountId, table.environment, table.objectId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    endpointId: text("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    // Copied from the event at import time so every query can filter by scope directly.
    accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    environment: environment("environment").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    firstAttemptAt: ts("first_attempt_at"),
    lastAttemptAt: ts("last_attempt_at"),
    nextAttemptAt: ts("next_attempt_at"),
    deliveredAt: ts("delivered_at"),
    terminalReason: text("terminal_reason"),
  },
  (table) => [index("webhook_deliveries_scope_event_idx").on(table.accountId, table.environment, table.eventId)],
);
