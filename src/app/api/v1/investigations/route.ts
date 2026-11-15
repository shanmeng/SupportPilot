import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/session";
import { listInvestigationsForUser } from "@/lib/investigations/service";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1, "limit must be 1-50").max(50, "limit must be 1-50").default(20),
  cursor: z.string().max(64).optional(),
});

/** Saved investigations, newest first: the engineer's own, or everyone's for a lead. Cursor-paginated. */
export async function GET(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return apiError(400, "invalid_request", parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  const page = await listInvestigationsForUser(user, parsed.data);
  return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
}
