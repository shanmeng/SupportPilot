import { NextResponse } from "next/server";

export type ApiErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_request" | "internal_error";

/** Standard error body for all `/api/v1` endpoints: `{ error: { code, message } }`. */
export function apiError(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
