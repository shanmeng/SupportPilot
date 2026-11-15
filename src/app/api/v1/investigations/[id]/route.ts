import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/session";
import { getInvestigationForUser } from "@/lib/investigations/service";

/**
 * One saved investigation. 404 when it does not exist or belongs to another engineer,
 * so the response never reveals whether someone else's case exists.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { id } = await context.params;
  const investigation = await getInvestigationForUser(user, id);
  if (!investigation) return apiError(404, "not_found", "Investigation not found.");
  return NextResponse.json(investigation, { headers: { "Cache-Control": "no-store" } });
}
