import { z } from "zod";
import { ROLES } from "./roles";

const sessionUserSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  image: z.string().nullable().default(null),
  role: z.enum(ROLES),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * Converts a raw Auth.js session into a trusted user, or null.
 * Anything malformed (missing id, unknown role, …) is treated as signed out.
 */
export function toSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object" || !("user" in session)) return null;
  const parsed = sessionUserSchema.safeParse(session.user);
  return parsed.success ? parsed.data : null;
}

/** Engineers may access only their own investigations; leads may access all. */
export function canAccessInvestigation(user: SessionUser, ownerId: string): boolean {
  return user.role === "lead" || user.id === ownerId;
}
