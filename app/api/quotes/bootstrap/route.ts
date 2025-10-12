import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  // Try to use the authenticated user's organization. If unauthenticated,
  // fall back to the first organization in the DB or demo in-memory data
  // so the quote builder remains usable for first-time visitors.
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  let organizationId: string | null = null;

  if (hasDatabase) {
    try {
      const user = await requireSession();
      organizationId = user.organizationId;
    } catch {
      const anyOrg = await prisma.organization.findFirst({ select: { id: true } });
      organizationId = anyOrg?.id ?? null;
    }
  }

  let settings = null;
  let customers: any[] = [];
  let templates: any[] = [];
  let presets: any[] = [];

  if (organizationId) {
    [settings, customers, templates, presets] = await Promise.all([
      prisma.companySettings.findUnique({ where: { organizationId } }),
      prisma.customer.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        include: { properties: { orderBy: { createdAt: 'desc' } } },
      }),
      prisma.serviceTemplate.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        include: {
          tierRules: { orderBy: { fromArea: 'asc' } },
          recipeItems: { include: { chemical: true } },
        },
      }),
      prisma.pricingPreset.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      }),
    ]);
  }

  // Provide sensible demo fallbacks when the database is empty to enable
  // a frictionless “try it” experience.
  const demoCustomers = [
    {
      id: 'demo-cust',
      name: 'Demo Customer',
      properties: [
        { id: 'demo-prop', address: '123 Demo St, Austin, TX', propertyType: 'Residential', area: 2200 },
      ],
    },
  ];
  const demoTemplates = [
    {
      id: 'demo-template',
      name: 'General Pest (Interior/Exterior)',
      mainUnit: 'ft2',
      setupTimeHrs: 0.5,
      timePer1000Hrs: 0.35,
      minPrice: 95,
      defaultInfestationMultiplier: 1,
      defaultComplexityMultiplier: 1,
      residentialMultiplier: 1,
      commercialMultiplier: 1.15,
      tierRules: [],
      recipeItems: [
        {
          useFor: 'both',
          usageRatePer1000: 3.2,
          chemical: {
            id: 'demo-chem-1',
            name: 'Bifenthrin 7.9%',
            packageSize: 1,
            packageCost: 85,
            wastePercent: 0.05,
          },
        },
      ],
    },
  ];
  const demoPresets = [
    {
      id: 'demo-preset',
      name: 'Default',
      pricingMode: 'margin',
      marginOrMarkup: 0.45,
      hourlyWage: 22,
      burdenPercent: 0.28,
      taxRate: 0.0825,
      roundingRule: 'nearest_5',
      minimum: 95,
      travelFixedMin: 15,
      travelMinsPerMile: 1.5,
      fees: 0,
      discounts: 0,
    },
  ];

  return NextResponse.json({
    settings: settings ?? { currency: 'USD', taxRate: 0.0825, roundingRule: 'nearest_5' },
    customers: customers?.length ? customers : demoCustomers,
    templates: templates?.length ? templates : demoTemplates,
    presets: presets?.length ? presets : demoPresets,
  });
}
