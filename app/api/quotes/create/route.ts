import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { PricingInputSchema } from '@/lib/pricing/schema';
import { runPricingEngine } from '@/lib/pricing/engine';

export const runtime = 'nodejs';

const CreateQuoteSchema = z.object({
  propertyId: z.string(),
  serviceTemplateId: z.string(),
  pricingInput: PricingInputSchema,
  expiresAt: z.string().datetime().optional(),
  status: z.string().optional(),
});

async function generateQuoteNumber(organizationId: string) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.floor(Math.random() * 10_000)
      .toString()
      .padStart(4, '0');
    const candidate = `Q-${year}-${suffix}`;
    const existing = await prisma.quote.findFirst({ where: { organizationId, quoteNumber: candidate } });
    if (!existing) {
      return candidate;
    }
  }
  return `Q-${year}-${Date.now()}`;
}

export async function POST(req: Request) {
  const user = await requireSession();
  const json = await req.json().catch(() => ({}));
  const parsed = CreateQuoteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { propertyId, serviceTemplateId, pricingInput, expiresAt, status } = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: user.organizationId },
    include: { customer: true },
  });
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const template = await prisma.serviceTemplate.findFirst({
    where: { id: serviceTemplateId, organizationId: user.organizationId },
  });
  if (!template) {
    return NextResponse.json({ error: 'Service template not found' }, { status: 404 });
  }

  const result = runPricingEngine(pricingInput);
  const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const quote = await prisma.$transaction(async (tx) => {
    const quoteNumber = await generateQuoteNumber(user.organizationId);
    const created = await tx.quote.create({
      data: {
        organizationId: user.organizationId,
        quoteNumber,
        propertyId,
        serviceTemplateId,
        status: status ?? 'draft',
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total,
        pricingModeSnapshot: pricingInput.mode,
        marginOrMarkupValue: pricingInput.marginOrMarkup,
        expiresAt: expiry,
        lineItems: {
          create: result.lineItems.map((item) => ({
            organizationId: user.organizationId,
            kind: item.kind,
            label: item.label,
            qty: item.qty ?? null,
            unit: item.unit ?? null,
            unitCost: item.unitCost ?? null,
            amount: item.amount,
            isOverride: item.isOverride ?? null,
            overrideReason: item.overrideReason ?? null,
          })),
        },
      },
      include: { lineItems: true },
    });

    await tx.quoteCalcSnapshot.create({
      data: {
        organizationId: user.organizationId,
        quoteId: created.id,
        json: (result.snapshot ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  return NextResponse.json({ id: quote.id, quoteNumber: quote.quoteNumber, total: quote.total });
}
