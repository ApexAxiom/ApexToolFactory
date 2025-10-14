import crypto from 'crypto';

import { calculateLaborCost, calculateMaterialCost, calculatePrice, calculateTravelCost } from './formulas';
import { findTierRule, resolvePropertyMultiplier } from './rules';
import { normalizeMainQuantity, type AreaUnit, type MainUnit } from './units';
import { PricingInputSchema } from './schema';

export interface PricingLineItem {
  kind: 'materials' | 'labor' | 'travel' | 'fee' | 'discount' | 'other' | 'tax';
  label: string;
  amount: number;
  qty?: number;
  unit?: string;
  unitCost?: number;
  isOverride?: boolean;
  overrideReason?: string;
}

export interface PricingResult {
  lineItems: PricingLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  snapshot: Record<string, unknown>;
}

const shortHash = (value: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);

/**
 * Executes the deterministic pricing engine.
 * @param unsafeInput raw inputs from the UI.
 * @returns line items and totals with a calculation snapshot.
 * @example
 * const result = await runPricingEngine(payload);
 */
export function runPricingEngine(unsafeInput: unknown): PricingResult {
  const input = PricingInputSchema.parse(unsafeInput);
  const { template } = input;
  const { quantity: baseQty, unit: normalizedUnit } = normalizeMainQuantity(
    input.area,
    template.mainUnit as MainUnit,
    input.unitsArea as AreaUnit,
  );
  const propertyMultiplier = resolvePropertyMultiplier(template, input.propertyType);
  const infestationMultiplier = input.infestationMultiplier || template.defaultInfestationMultiplier;
  const complexityMultiplier = input.complexityMultiplier || template.defaultComplexityMultiplier;

  const materials = input.chemicals
    .filter(
      (chemical) =>
        chemical.useFor === 'both' ||
        (chemical.useFor === 'interior' && input.interior) ||
        (chemical.useFor === 'exterior' && input.exterior),
    )
    .map((chemical) => {
      const interiorExteriorFactor =
        chemical.useFor === 'both'
          ? 1
          : chemical.useFor === 'interior'
            ? input.interior
              ? 1
              : 0
            : input.exterior
              ? 1
              : 0;
      const result = calculateMaterialCost({
        usageRatePer1000: chemical.usageRatePer1000,
        baseQty,
        infestationMultiplier: infestationMultiplier * propertyMultiplier,
        interiorExteriorFactor,
        packageSize: chemical.packageSize,
        packageCost: chemical.packageCost,
        wastePercent: chemical.wastePercent,
      });
      return {
        kind: 'materials' as const,
        label: chemical.name,
        amount: result.materialCost,
        qty: result.usageQty,
        unit: normalizedUnit,
        unitCost: chemical.packageCost,
      } satisfies PricingLineItem;
    });

  const laborCalc = calculateLaborCost({
    setupTime: input.setupTime,
    timePer1000: input.timePer1000,
    baseQty,
    complexityMultiplier: complexityMultiplier * propertyMultiplier,
    manualAdders: input.manualLaborAdderHours,
    hourlyWage: input.hourlyWage,
    burdenPercent: input.burdenPercent,
  });

  const travelCalc = calculateTravelCost({
    fixedMinutes: input.travelFixedMinutes,
    minutesPerMile: input.travelMinutesPerMile,
    miles: input.travelMiles,
    hourlyWage: input.hourlyWage,
    burdenPercent: input.burdenPercent,
    overrides: {
      ...(input.travelOverrideMinutes !== undefined ? { minutes: input.travelOverrideMinutes } : {}),
      ...(input.travelOverrideAmount !== undefined ? { amount: input.travelOverrideAmount } : {}),
    },
  });

  const tierRule = findTierRule(input.tierRules, input.propertyType, baseQty);

  const preCost = materials.reduce((sum, item) => sum + item.amount, 0) + laborCalc.laborCost + travelCalc.travelCost;

  const priceCalc = calculatePrice({
    preCost,
    mode: input.mode,
    marginOrMarkup: input.marginOrMarkup,
    fees: input.fees,
    discounts: input.discounts,
    taxRate: input.taxRate,
    roundingRule: input.roundingRule,
    minimum: Math.max(input.minimum, template.minPrice),
    tierRule,
    propertyType: input.propertyType,
    area: baseQty,
  });

  const subtotal = priceCalc.discounted;
  const tax = subtotal * input.taxRate;
  const materialsCost = materials.reduce((sum, item) => sum + item.amount, 0);
  const otherCost = input.fees - Math.abs(input.discounts);

  const lineItems: PricingLineItem[] = [
    ...materials,
    {
      kind: 'labor',
      label: 'Labor',
      amount: laborCalc.laborCost,
      qty: laborCalc.laborHours,
      unit: 'hours',
      unitCost: input.hourlyWage,
      isOverride: input.manualLaborAdderHours > 0,
      ...(input.manualLaborReason ? { overrideReason: input.manualLaborReason } : {}),
    },
    {
      kind: 'travel',
      label: 'Travel',
      amount: travelCalc.travelCost,
      qty: travelCalc.minutes,
      unit: 'minutes',
      unitCost: (input.hourlyWage * (1 + input.burdenPercent)) / 60,
      isOverride: Boolean(input.travelOverrideAmount || input.travelOverrideMinutes),
      ...(input.travelOverrideReason ? { overrideReason: input.travelOverrideReason } : {}),
    },
  ];

  if (input.fees) {
    lineItems.push({ kind: 'fee', label: 'Additional fees', amount: input.fees });
  }
  if (input.discounts) {
    lineItems.push({ kind: 'discount', label: 'Discounts', amount: -Math.abs(input.discounts) });
  }
  if (tax) {
    lineItems.push({ kind: 'tax', label: 'Tax', amount: tax });
  }

  const total = priceCalc.rounded;

  const snapshot = {
    version: '1.0',
    inputs: {
      propertyType: input.propertyType,
      areaInput: input.area,
      normalizedBaseQty: baseQty,
      infestationMultiplier,
      complexityMultiplier,
      interior: input.interior,
      exterior: input.exterior,
      pricingMode: input.mode,
      discount: input.discounts,
      fees: input.fees,
      overrides: {
        manualLaborAdderHours: input.manualLaborAdderHours || null,
        manualLaborReason: input.manualLaborReason ?? null,
        travelMinutesOverride: input.travelOverrideMinutes ?? null,
        travelOverrideAmount: input.travelOverrideAmount ?? null,
        travelOverrideReason: input.travelOverrideReason ?? null,
      },
    },
    template: {
      mainUnit: template.mainUnit,
      residentialMultiplier: template.residentialMultiplier,
      commercialMultiplier: template.commercialMultiplier,
      hash: shortHash({
        timePer1000: input.timePer1000,
        setupTime: input.setupTime,
        minPrice: template.minPrice,
        mainUnit: template.mainUnit,
      }),
    },
    chemicals: input.chemicals.map((chemical) => ({
      id: chemical.id,
      name: chemical.name,
      hash: shortHash({
        usageRatePer1000: chemical.usageRatePer1000,
        packageSize: chemical.packageSize,
        packageCost: chemical.packageCost,
        wastePercent: chemical.wastePercent,
      }),
    })),
    intermediates: {
      materials,
      laborHrs: laborCalc.laborHours,
      materialsCost,
      laborCost: laborCalc.laborCost,
      travelCost: travelCalc.travelCost,
      otherCost,
      subtotal,
      taxBeforeRounding: tax,
      totalBeforeRounding: priceCalc.taxed,
    },
    outputs: { total },
  } satisfies Record<string, unknown>;

  return {
    lineItems,
    subtotal,
    tax,
    total,
    snapshot,
  };
}
