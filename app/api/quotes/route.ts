import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getJson, putJson, withLock, paths } from "@/lib/s3";
import { newId, todayYmd } from "@/lib/ids";
import { priceItems } from "@/lib/price";
import type { IndexRow, Meta, Quote } from "@/lib/types";

/**
 * Returns the lightweight quote index for the authenticated organization.
 * @returns JSON array of quote summaries.
 * @example
 * ```ts
 * const res = await fetch("/api/quotes");
 * ```
 */
export async function GET() {
  const s = await session(); if (!s.authed) return NextResponse.json({error:"unauthorized"},{status:401});
  const idx = await getJson<IndexRow[]>(paths.index(s.orgId!)) || [];
  return NextResponse.json(idx);
}

/**
 * Creates a quote, persists it to S3, and updates the index.
 * @param req - Request containing quote payload.
 * @returns Newly created quote object.
 * @example
 * ```ts
 * await fetch("/api/quotes", { method: "POST", body: JSON.stringify({ customerId: "1", propertyId: "1", items: [] }) });
 * ```
 */
export async function POST(req: Request) {
  const s = await session(); if (!s.authed) return NextResponse.json({error:"unauthorized"},{status:401});
  const body = await req.json() as { customerId:string; propertyId:string; items:{unitPrice:number; qty:number}[]; customerName:string; };

  let quote: Quote | null = null;
  await withLock(s.orgId!, async ()=>{
    const metaKey = paths.meta(s.orgId!);
    const idxKey = paths.index(s.orgId!);
    const meta = (await getJson<Meta>(metaKey)) || { nextDailySerial: 1, serialDate: todayYmd() };
    const today = todayYmd();
    const serial = (meta.serialDate === today) ? meta.nextDailySerial : 1;
    meta.serialDate = today; meta.nextDailySerial = serial + 1;

    const id = newId();
    const number = `Q${today}-${String(serial).padStart(4,"0")}`;
    const totals = priceItems(body.items);
    const now = new Date().toISOString();
    quote = { id, orgId: s.orgId!, number, customerId: body.customerId, propertyId: body.propertyId,
      items: body.items.map(i=>({ templateId:"", qty:i.qty, unitPrice:i.unitPrice, lineTotal: i.unitPrice*i.qty })), ...totals, createdAt: now };

    const qKey = paths.quote(s.orgId!, id);
    await putJson(qKey, quote);

    const idx = (await getJson<IndexRow[]>(idxKey)) || [];
    idx.unshift({ id, number, customerName: body.customerName, createdAt: now, total: totals.total });
    await putJson(idxKey, idx.slice(0,5000)); // cap
    await putJson(metaKey, meta);
  });

  return NextResponse.json(quote!);
}
