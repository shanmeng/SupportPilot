import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { StopReason } from "@/lib/agent/run-agent";
import type { Environment } from "@/lib/business/scope";
import type {
  AnswerMode,
  InvestigationInput,
  InvestigationSummary,
  SavedInvestigation,
} from "@/lib/investigations/types";
import { getDb } from "./client";
import { investigations, users } from "./schema";

type Row = typeof investigations.$inferSelect;

function toScope(row: Pick<Row, "accountId" | "environment" | "paymentId">) {
  if (!row.accountId && !row.environment && !row.paymentId) return null;
  return {
    ...(row.accountId ? { accountId: row.accountId } : {}),
    ...(row.environment ? { environment: row.environment as Environment } : {}),
    ...(row.paymentId ? { paymentId: row.paymentId } : {}),
  };
}

export async function saveInvestigation(ownerId: string, input: InvestigationInput): Promise<{ id: string; createdAt: string }> {
  const [row] = await getDb()
    .insert(investigations)
    .values({
      ownerId,
      question: input.question,
      accountId: input.scope?.accountId ?? null,
      environment: input.scope?.environment ?? null,
      paymentId: input.scope?.paymentId ?? null,
      mode: input.mode,
      stopReason: input.stopReason,
      answer: input.answer,
      citations: input.citations,
      steps: input.steps,
    })
    .returning({ id: investigations.id, createdAt: investigations.createdAt });
  if (!row) throw new Error("Saving the investigation returned no row");
  return { id: row.id, createdAt: row.createdAt.toISOString() };
}

/** Reads one investigation without any access check; callers must authorize (see investigations/service). */
export async function findInvestigation(id: string): Promise<SavedInvestigation | null> {
  const [row] = await getDb()
    .select({ investigation: investigations, ownerName: users.name })
    .from(investigations)
    .innerJoin(users, eq(users.id, investigations.ownerId))
    .where(eq(investigations.id, id));
  if (!row) return null;
  const inv = row.investigation;
  return {
    id: inv.id,
    ownerId: inv.ownerId,
    ownerName: row.ownerName,
    question: inv.question,
    scope: toScope(inv),
    mode: inv.mode as AnswerMode,
    stopReason: inv.stopReason as StopReason | null,
    answer: inv.answer,
    citations: inv.citations,
    steps: inv.steps,
    createdAt: inv.createdAt.toISOString(),
  };
}

/**
 * Newest first. `ownerId` null lists everyone's (leads only; the caller decides).
 * `afterId` is the last ID of the previous page; ordering ties are broken by ID.
 */
export async function listInvestigations(params: { ownerId: string | null; limit: number; afterId?: string }): Promise<InvestigationSummary[]> {
  const conditions: SQL[] = [];
  if (params.ownerId) conditions.push(eq(investigations.ownerId, params.ownerId));
  if (params.afterId) {
    conditions.push(
      sql`(${investigations.createdAt}, ${investigations.id}) < (select i.created_at, i.id from investigations i where i.id = ${params.afterId})`,
    );
  }
  const rows = await getDb()
    .select({
      id: investigations.id,
      question: investigations.question,
      accountId: investigations.accountId,
      environment: investigations.environment,
      paymentId: investigations.paymentId,
      stopReason: investigations.stopReason,
      createdAt: investigations.createdAt,
      ownerName: users.name,
    })
    .from(investigations)
    .innerJoin(users, eq(users.id, investigations.ownerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(investigations.createdAt), desc(investigations.id))
    .limit(params.limit);
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    scope: toScope(row),
    stopReason: row.stopReason as StopReason | null,
    ownerName: row.ownerName,
    createdAt: row.createdAt.toISOString(),
  }));
}
