import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getJson, paths, putJson, withLock } from "@/lib/s3";
import { newId, todayYmd } from "@/lib/ids";
import { priceItems } from "@/lib/price";
import type { Invoice, InvoiceIndexRow, Meta } from "@/lib/types";

interface InvoicePayload {
  quoteId?: string | null;
  customerId?: string;
  propertyId?: string;
  customerName?: string;
  items: { unitPrice: number; qty: number }[];
}

/**
 * Returns the lightweight invoice index for the authenticated organization.
 */
export async function GET() {
  const s = await session(); if (!s.authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const idx = await getJson<InvoiceIndexRow[]>(paths.invoiceIndex(s.orgId!)) || [];
  return NextResponse.json(idx);
}

/**
 * Creates an invoice, persists it to S3, and updates the index.
 */
export async function POST(req: Request) {
  const s = await session(); if (!s.authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json() as InvoicePayload;

  let invoice: Invoice | null = null;
  await withLock(s.orgId!, async () => {
    const metaKey = paths.invoiceMeta(s.orgId!);
    const idxKey = paths.invoiceIndex(s.orgId!);
    const meta = (await getJson<Meta>(metaKey)) || { nextDailySerial: 1, serialDate: todayYmd() };
    const today = todayYmd();
    const serial = (meta.serialDate === today) ? meta.nextDailySerial : 1;
    meta.serialDate = today; meta.nextDailySerial = serial + 1;

    const id = newId();
    const number = `I${today}-${String(serial).padStart(4, "0")}`;
    const totals = priceItems(body.items);
    const now = new Date().toISOString();
    const customerName = body.customerName?.trim() ?? "";
    invoice = {
      id,
      orgId: s.orgId!,
      number,
      quoteId: body.quoteId ?? null,
      customerId: body.customerId ?? "",
      propertyId: body.propertyId ?? "",
      customerName,
      items: body.items.map(i => ({ templateId: "", qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.qty })),
      ...totals,
      createdAt: now
    };

    await putJson(paths.invoice(s.orgId!, id), invoice);

    const idx = (await getJson<InvoiceIndexRow[]>(idxKey)) || [];
    idx.unshift({ id, number, customerName, createdAt: now, total: totals.total, quoteId: body.quoteId ?? null });
    await putJson(idxKey, idx.slice(0, 5000));
    await putJson(metaKey, meta);
  });

  return NextResponse.json(invoice!);
}
