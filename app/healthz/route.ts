import { NextResponse } from "next/server";

/**
 * Health check endpoint used by AWS App Runner.
 * @returns JSON payload confirming service availability.
 * @example
 * ```ts
 * const response = await GET();
 * ```
 */
export function GET() {
  return NextResponse.json({ ok: true });
}
