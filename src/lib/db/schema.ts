import { sql } from "drizzle-orm";
import {
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
