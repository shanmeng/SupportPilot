import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/api/openapi";

/** The OpenAPI 3.1 document for /api/v1 (public). */
export async function GET() {
  return NextResponse.json(openApiSpec, { headers: { "Cache-Control": "public, max-age=300" } });
}
