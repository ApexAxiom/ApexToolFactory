import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getJson, paths } from "@/lib/s3";
import type { Quote } from "@/lib/types";

/**
 * Fetches an individual quote by id.
 * @param _ - Request object (unused).
 * @param ctx - Route parameters containing the quote id.
 * @returns Quote payload or 404 error.
 * @example
 * ```ts
 * const res = await fetch("/api/quotes/123");
 * ```
 */
export async function GET(_: Request, ctx: { params: { id: string }}) {
  const s = await session(); if (!s.authed) return NextResponse.json({error:"unauthorized"},{status:401});
  const q = await getJson<Quote>(paths.quote(s.orgId!, ctx.params.id));
  if (!q) return NextResponse.json({error:"not_found"},{status:404});
  return NextResponse.json(q);
}
