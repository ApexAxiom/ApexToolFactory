import { NextResponse } from "next/server";

/**
 * Placeholder endpoint for creating customers.
 * @returns Not implemented response until feature lands.
 * @example
 * ```ts
 * const res = await fetch("/api/customers", { method: "POST" });
 * ```
 */
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
