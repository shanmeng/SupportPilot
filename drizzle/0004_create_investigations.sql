CREATE TABLE "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"question" text NOT NULL,
	"account_id" text,
	"environment" "environment",
	"payment_id" text,
	"mode" text NOT NULL,
	"stop_reason" text,
	"answer" text,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investigations_owner_created_idx" ON "investigations" USING btree ("owner_id","created_at","id");--> statement-breakpoint
CREATE INDEX "investigations_created_idx" ON "investigations" USING btree ("created_at","id");