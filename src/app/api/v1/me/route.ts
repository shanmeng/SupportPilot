import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";

/** The signed-in user and their role. 401 when not signed in or the session is invalid. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (response) return response;
  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
}
