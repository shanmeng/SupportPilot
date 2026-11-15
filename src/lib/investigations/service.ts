import "server-only";
import { canAccessInvestigation, type SessionUser } from "@/lib/auth/authorization";
import { findInvestigation, listInvestigations } from "@/lib/db/investigations-repository";
import type { InvestigationPage, SavedInvestigation } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The investigation if this user may read it; null when it does not exist OR is not theirs. */
export async function getInvestigationForUser(user: SessionUser, id: string): Promise<SavedInvestigation | null> {
  if (!UUID.test(id)) return null;
  const investigation = await findInvestigation(id);
  if (!investigation || !canAccessInvestigation(user, investigation.ownerId)) return null;
  return investigation;
}

/** Engineers: their own; leads: everyone's. Newest first, cursor-paginated. */
export async function listInvestigationsForUser(
  user: SessionUser,
  options: { limit: number; cursor?: string },
): Promise<InvestigationPage> {
  const afterId = options.cursor && UUID.test(options.cursor) ? options.cursor : undefined;
  const rows = await listInvestigations({
    ownerId: user.role === "lead" ? null : user.id,
    limit: options.limit + 1,
    afterId,
  });
  const items = rows.slice(0, options.limit);
  return { items, nextCursor: rows.length > options.limit ? (items.at(-1)?.id ?? null) : null };
}
