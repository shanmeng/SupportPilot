CREATE TYPE "public"."environment" AS ENUM('production', 'sandbox');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"production_status" text NOT NULL,
	"current_plan" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"event_type" text NOT NULL,
	"api_version" text,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"api_version" text,
	"failure_code" text,
	"failure_category" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"succeeded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"account_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"first_attempt_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"terminal_reason" text
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"url_host" text NOT NULL,
	"status" text NOT NULL,
	"api_version" text,
	"created_at" timestamp with time zone NOT NULL,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_scope_object_idx" ON "events" USING btree ("account_id","environment","object_id");--> statement-breakpoint
CREATE INDEX "payments_scope_idx" ON "payments" USING btree ("account_id","environment");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_scope_event_idx" ON "webhook_deliveries" USING btree ("account_id","environment","event_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_scope_idx" ON "webhook_endpoints" USING btree ("account_id","environment");