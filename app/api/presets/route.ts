import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

const PresetSchema = z.object({
  name: z.string().min(1),
  pricingMode: z.enum(['margin', 'markup']).default('margin'),
  marginOrMarkup: z.number().min(0).max(2),
  hourlyWage: z.number().min(0),
  burdenPercent: z.number().min(0).max(5),
  taxRate: z.number().min(0).max(1),
  roundingRule: z.enum(['nearest_1', 'nearest_5', 'psychological_9']).default('nearest_5'),
  minimum: z.number().min(0),
  travelFixedMin: z.number().min(0),
  travelMinsPerMile: z.number().min(0),
  fees: z.number().min(0).default(0),
  discounts: z.number().min(0).default(0),
});

export async function GET() {
  const user = await requireSession();
  const presets = await prisma.pricingPreset.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ presets });
}

export async function POST(req: Request) {
  const user = await requireSession();
  const json = await req.json().catch(() => ({}));
  const parsed = PresetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = await prisma.pricingPreset.create({
    data: { organizationId: user.organizationId, ...parsed.data },
  });
  return NextResponse.json({ preset: created });
}
