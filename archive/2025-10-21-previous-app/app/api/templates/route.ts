import { NextResponse } from "next/server";

/**
 * Placeholder endpoint for creating service templates.
 * @returns Not implemented response placeholder.
 * @example
 * ```ts
 * const res = await fetch("/api/templates", { method: "POST" });
 * ```
 */
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
