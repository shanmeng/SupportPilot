import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
