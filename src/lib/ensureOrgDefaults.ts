import type { PricingPreset, ServiceTemplate } from '@prisma/client';

import { prisma } from '@/lib/db';

/**
 * Ensure that an organization has the minimal defaults needed for quoting.
 *
 * @param orgId - The identifier for the organization to seed defaults for.
 * @returns A promise resolving to the ensured pricing preset and service template.
 *
 * @example
 * ```ts
 * const { preset, template } = await ensureOrgDefaults('org_123');
 * console.log(preset.name, template.name);
 * ```
 */
export async function ensureOrgDefaults(orgId: string): Promise<{ preset: PricingPreset; template: ServiceTemplate }> {
  let preset = await prisma.pricingPreset.findFirst({ where: { orgId } });
  if (!preset) {
    preset = await prisma.pricingPreset.create({
      data: {
        orgId,
        name: 'Default',
        pricingMode: 'margin',
        marginOrMarkup: 0.45,
        hourlyWage: 22,
        burdenPercent: 0.28,
        taxRate: 0.0825,
        roundingRule: 'nearest_5',
        minimum: 95,
        travelFixedMinutes: 15,
        travelMinutesPerMile: 1.5,
        travelMiles: 0,
        fees: 0,
        discounts: 0,
      },
    });
  }

  let template = await prisma.serviceTemplate.findFirst({ where: { orgId } });
  if (!template) {
    template = await prisma.serviceTemplate.create({
      data: {
        orgId,
        name: 'General Pest (Interior/Exterior)',
        mainUnit: 'ft2',
        setupTimeHrs: 0.5,
        timePer1000Hrs: 0.35,
        minPrice: 95,
        defaultInfestationMultiplier: 1,
        defaultComplexityMultiplier: 1,
        residentialMultiplier: 1,
        commercialMultiplier: 1.15,
        tierRules: '[]',
      },
    });
  }

  return { preset, template };
}
