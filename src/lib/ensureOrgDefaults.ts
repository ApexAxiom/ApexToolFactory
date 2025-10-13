import type { PricingPreset, ServiceTemplate } from '@prisma/client';

import { prisma } from '@/lib/db';

/**
 * Ensure that an organization has the minimal defaults needed for quoting.
 *
 * @param organizationId - The identifier for the organization to seed defaults for.
 * @returns A promise resolving to the ensured pricing preset and service template.
 *
 * @example
 * ```ts
 * const { preset, template } = await ensureOrgDefaults('org_123');
 * console.log(preset.name, template.name);
 * ```
 */
export async function ensureOrgDefaults(
  organizationId: string,
): Promise<{ preset: PricingPreset; template: ServiceTemplate }> {
  let preset = await prisma.pricingPreset.findFirst({ where: { organizationId } });
  if (!preset) {
    preset = await prisma.pricingPreset.create({
      data: {
        organizationId,
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
    });
  }

  let template = await prisma.serviceTemplate.findFirst({ where: { organizationId } });
  if (!template) {
    template = await prisma.serviceTemplate.create({
      data: {
        organizationId,
        name: 'General Pest (Interior/Exterior)',
        mainUnit: 'ft2',
        setupTimeHrs: 0.5,
        timePer1000Hrs: 0.35,
        minPrice: 95,
        defaultInfestationMultiplier: 1,
        defaultComplexityMultiplier: 1,
        residentialMultiplier: 1,
        commercialMultiplier: 1.15,
      },
    });
  }

  return { preset, template };
}
