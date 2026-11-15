CREATE TYPE "public"."document_authority" AS ENUM('official', 'operational_guidance', 'historical_case');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('api_doc', 'business_rule', 'troubleshooting', 'support_case', 'release_note', 'migration_guide');--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"section" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"embedding_model" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(section, '')), 'A') || setweight(to_tsvector('english', content), 'B')) STORED NOT NULL,
	CONSTRAINT "document_chunks_document_index_unique" UNIQUE("document_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"authority" "document_authority" NOT NULL,
	"language" text NOT NULL,
	"product_areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"rule_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"source_path" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_chunks_search_vector_idx" ON "document_chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);