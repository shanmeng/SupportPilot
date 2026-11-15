CREATE TYPE "public"."user_role" AS ENUM('engineer', 'lead');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" text NOT NULL,
	"login" text NOT NULL,
	"name" text,
	"email" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'engineer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
