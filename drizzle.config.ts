import { defineConfig } from "drizzle-kit";

// Migrations prefer a direct (unpooled) connection when the host provides one
// (Neon on Vercel sets DATABASE_URL_UNPOOLED); otherwise DATABASE_URL is used.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
