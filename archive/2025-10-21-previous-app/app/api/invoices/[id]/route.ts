import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getJson, paths } from "@/lib/s3";
import type { Invoice } from "@/lib/types";

/**
 * Fetches an individual invoice by id.
 */
export async function GET(_: Request, ctx: { params: { id: string }}) {
  const s = await session(); if (!s.authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const invoice = await getJson<Invoice>(paths.invoice(s.orgId!, ctx.params.id));
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(invoice);
}
