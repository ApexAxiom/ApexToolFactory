import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { ensureOrgDefaults } from '@/lib/ensureOrgDefaults';

export const runtime = 'nodejs';

/**
 * Load organization-specific bootstrap data for the quote wizard.
 *
 * @returns A JSON response containing settings, customers, templates, and presets.
 *
 * @example
 * ```ts
 * const res = await fetch('/api/quotes/bootstrap');
 * const data = await res.json();
 * ```
 */
export async function GET() {
  const user = await requireSession();
  const orgId = user.organizationId;

  await ensureOrgDefaults(orgId);

  const settingsModel = (prisma as {
    settings?: {
      findFirst: (args: { where: { organizationId: string } }) => Promise<unknown>;
    };
  }).settings;

  const settingsPromise = settingsModel
    ? settingsModel.findFirst({ where: { organizationId: orgId } }).catch(() => null)
    : Promise.resolve<null>(null);

  const [settings, customers, templates, presets] = await Promise.all([
    settingsPromise,
    prisma.customer.findMany({ where: { organizationId: orgId }, include: { properties: true } }),
    prisma.serviceTemplate.findMany({ where: { organizationId: orgId } }),
    prisma.pricingPreset.findMany({ where: { organizationId: orgId } }),
  ]);

  return NextResponse.json({
    settings: settings ?? { currency: 'USD', taxRate: 0.0825, roundingRule: 'nearest_5' },
    customers,
    templates,
    presets,
  });
}
