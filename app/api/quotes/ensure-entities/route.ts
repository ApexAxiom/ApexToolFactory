import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

const BodySchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  propertyName: z.string().trim().min(1).optional(),
  propertyType: z.enum(['Residential', 'Commercial']).optional(),
  area: z.number().nonnegative().optional(),
  serviceTemplateName: z.string().trim().min(1).optional(),
});

/**
 * Ensures customer, property, and service template records exist for the wizard flow.
 * @param req The incoming request carrying optional entity names.
 * @returns Identifiers for the ensured entities.
 * @example
 * const res = await fetch('/api/quotes/ensure-entities', { method: 'POST', body: JSON.stringify({ customerName: 'Acme' }) });
 */
export async function POST(req: Request) {
  const user = await requireSession();
  const orgId = user.organizationId;

  const raw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { customerName, propertyName, propertyType, area, serviceTemplateName } = parsed.data;
  if (!customerName && !propertyName && !serviceTemplateName) {
    return NextResponse.json({ error: 'Provide at least one entity name to ensure.' }, { status: 400 });
  }

  const defaults = {
    propertyType: propertyType ?? 'Residential',
    area: area ?? 0,
  } as const;

  let customerId: string | undefined;
  let propertyId: string | undefined;
  let templateId: string | undefined;

  const customerRecord = customerName
    ? await prisma.customer.findFirst({ where: { organizationId: orgId, name: customerName } })
    : null;
  const propertyRecord = propertyName
    ? await prisma.property.findFirst({
        where: {
          organizationId: orgId,
          address: propertyName,
          ...(customerRecord ? { customerId: customerRecord.id } : {}),
        },
      })
    : null;
  const templateRecord = serviceTemplateName
    ? await prisma.serviceTemplate.findFirst({ where: { organizationId: orgId, name: serviceTemplateName } })
    : null;

  const customer = customerRecord
    ?? (customerName
      ? await prisma.customer.create({
          data: { organizationId: orgId, type: 'Business', name: customerName },
        })
      : null);
  customerId = customer?.id;

  if (propertyName && !customerId) {
    return NextResponse.json({ error: 'customerName is required when ensuring a property.' }, { status: 400 });
  }

  const property = propertyRecord
    ?? (propertyName && customer
      ? await prisma.property.create({
          data: {
            organizationId: orgId,
            customerId: customer.id,
            propertyType: defaults.propertyType,
            address: propertyName,
            area: defaults.area,
          },
        })
      : null);
  propertyId = property?.id;

  const template = templateRecord
    ?? (serviceTemplateName
      ? await prisma.serviceTemplate.create({
          data: {
            organizationId: orgId,
            name: serviceTemplateName,
            mainUnit: 'ft2',
            setupTimeHrs: 0.5,
            timePer1000Hrs: 0.35,
            minPrice: 95,
            defaultInfestationMultiplier: 1,
            defaultComplexityMultiplier: 1,
            residentialMultiplier: 1,
            commercialMultiplier: 1.15,
          },
        })
      : null);
  templateId = template?.id;

  return NextResponse.json({
    customerId,
    propertyId,
    serviceTemplateId: templateId,
    customer: customer ? { id: customer.id, name: customer.name } : null,
    property: property
      ? {
          id: property.id,
          address: property.address,
          area: property.area,
          propertyType: property.propertyType as 'Residential' | 'Commercial',
        }
      : null,
    serviceTemplate: template ? { id: template.id, name: template.name } : null,
  });
}
