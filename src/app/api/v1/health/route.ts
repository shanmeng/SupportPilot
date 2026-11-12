import { connection, NextResponse } from "next/server";
import { databaseHealthProbes } from "@/lib/db/health-probes";
import { checkHealth } from "@/lib/health";

/** Public readiness check used by deploy smoke tests and uptime monitoring. */
export async function GET() {
  // Always evaluate at request time; never prerender a health result at build.
  await connection();
  const { httpStatus, body } = await checkHealth(databaseHealthProbes);
  return NextResponse.json(body, {
    status: httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
}
