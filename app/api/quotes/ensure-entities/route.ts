import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

type Payload = {
  customerName: string;
  propertyAddress: string;
  propertyType?: 'Residential' | 'Commercial';
  area?: number;
  templateName: string;
};

/**
 * Create or reuse customer, property, template, and pricing preset records for Step 1.
 *
 * @param req - The incoming request containing the payload for ensuring entities.
 * @returns A JSON response with the ensured entities or an error response.
 *
 * @example
 * ```ts
 * const response = await fetch('/api/quotes/ensure-entities', {
 *   method: 'POST',
 *   body: JSON.stringify({ customerName: 'Acme', propertyAddress: '1 Main', templateName: 'General' }),
 * });
 * ```
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const orgId = user.organizationId;

    const body = (await req.json()) as Partial<Payload>;
    const customerName = (body.customerName ?? '').trim();
    const propertyAddress = (body.propertyAddress ?? '').trim();
    const templateName = (body.templateName ?? '').trim();
    const propertyType = (body.propertyType ?? 'Residential') as 'Residential' | 'Commercial';
    const area = Number(body.area ?? 0) || 0;

    if (!customerName || !propertyAddress || !templateName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const customer =
      (await prisma.customer.findFirst({ where: { organizationId: orgId, name: customerName } })) ??
      (await prisma.customer.create({
        data: { organizationId: orgId, type: 'Business', name: customerName },
      }));

    const property =
      (await prisma.property.findFirst({
        where: { organizationId: orgId, customerId: customer.id, address: propertyAddress },
      })) ??
      (await prisma.property.create({
        data: {
          organizationId: orgId,
          customerId: customer.id,
          propertyType,
          address: propertyAddress,
          area,
        },
      }));

    const template =
      (await prisma.serviceTemplate.findFirst({
        where: { organizationId: orgId, name: templateName },
      })) ??
      (await prisma.serviceTemplate.create({
        data: {
          organizationId: orgId,
          name: templateName,
          mainUnit: 'ft2',
          setupTimeHrs: 0.5,
          timePer1000Hrs: 0.35,
          minPrice: 95,
          defaultInfestationMultiplier: 1,
          defaultComplexityMultiplier: 1,
          residentialMultiplier: 1,
          commercialMultiplier: 1.15,
        },
      }));

    const preset =
      (await prisma.pricingPreset.findFirst({ where: { organizationId: orgId } })) ??
      (await prisma.pricingPreset.create({
        data: {
          organizationId: orgId,
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
      }));

    return NextResponse.json({
      customer: { id: customer.id, name: customer.name },
      property: { id: property.id, address: property.address, area: property.area, propertyType: property.propertyType },
      template: { id: template.id, name: template.name },
      preset: { id: preset.id, name: preset.name },
    });
  } catch (error) {
    console.error('Failed to ensure quote wizard entities', error);
    return NextResponse.json({ error: 'Failed to ensure quote entities' }, { status: 500 });
  }
}
