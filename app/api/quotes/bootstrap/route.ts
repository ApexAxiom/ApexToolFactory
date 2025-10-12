import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireSession();

  const [settings, customers, templates, presets] = await Promise.all([
    prisma.companySettings.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.customer.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
      include: { properties: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.serviceTemplate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
      include: {
        tierRules: { orderBy: { fromArea: 'asc' } },
        recipeItems: { include: { chemical: true } },
      },
    }),
    prisma.pricingPreset.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({ settings, customers, templates, presets });
}
