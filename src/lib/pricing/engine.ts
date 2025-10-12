import { z } from 'zod';
import { calculateLaborCost, calculateMaterialCost, calculatePrice, calculateTravelCost } from './formulas';
import type { TierRule } from './rules';
import { findTierRule, resolvePropertyMultiplier } from './rules';

export const PricingInputSchema = z.object({
  propertyType: z.enum(['Residential', 'Commercial']),
  area: z.number().positive(),
  infestationMultiplier: z.number().positive().default(1),
  complexityMultiplier: z.number().positive().default(1),
  interior: z.boolean().default(true),
  exterior: z.boolean().default(true),
  chemicals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      usageRatePer1000: z.number().nonnegative(),
      packageSize: z.number().positive(),
      packageCost: z.number().nonnegative(),
      wastePercent: z.number().nonnegative(),
      useFor: z.enum(['interior', 'exterior', 'both']),
    }),
  ),
  setupTime: z.number().nonnegative(),
  timePer1000: z.number().nonnegative(),
  hourlyWage: z.number().nonnegative(),
  burdenPercent: z.number().nonnegative(),
  travelFixedMinutes: z.number().nonnegative(),
  travelMinutesPerMile: z.number().nonnegative(),
  travelMiles: z.number().nonnegative(),
  travelOverrideMinutes: z.number().nonnegative().optional(),
  travelOverrideAmount: z.number().nonnegative().optional(),
  manualLaborAdderHours: z.number().nonnegative().default(0),
  mode: z.enum(['margin', 'markup']),
  marginOrMarkup: z.number().min(0).max(0.95),
  fees: z.number().default(0),
  discounts: z.number().default(0),
  taxRate: z.number().default(0),
  roundingRule: z.enum(['nearest_1', 'nearest_5', 'psychological_9']),
  minimum: z.number().default(0),
  tierRules: z.array(z.custom<TierRule>()).default([]),
  template: z.object({
    residentialMultiplier: z.number(),
    commercialMultiplier: z.number(),
    defaultInfestationMultiplier: z.number(),
    defaultComplexityMultiplier: z.number(),
    minPrice: z.number().nonnegative(),
  }),
  currency: z.string().default('USD'),
});

export type PricingInput = z.infer<typeof PricingInputSchema>;

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
  const propertyMultiplier = resolvePropertyMultiplier(template, input.propertyType);
  const infestationMultiplier = input.infestationMultiplier || template.defaultInfestationMultiplier;
  const complexityMultiplier = input.complexityMultiplier || template.defaultComplexityMultiplier;

  const materials = input.chemicals
    .filter((chemical) =>
      chemical.useFor === 'both' || (chemical.useFor === 'interior' && input.interior) || (chemical.useFor === 'exterior' && input.exterior),
    )
    .map((chemical) => {
      const factor =
        chemical.useFor === 'both' ? 1 : chemical.useFor === 'interior' ? (input.interior ? 1 : 0) : input.exterior ? 1 : 0;
      const result = calculateMaterialCost({
        usageRatePer1000: chemical.usageRatePer1000,
        area: input.area,
        infestationMultiplier: infestationMultiplier * propertyMultiplier,
        interiorExteriorFactor: factor,
        packageSize: chemical.packageSize,
        packageCost: chemical.packageCost,
        wastePercent: chemical.wastePercent,
      });
      return {
        kind: 'materials' as const,
        label: chemical.name,
        amount: result.materialCost,
        qty: result.usageQty,
        unit: 'units',
        unitCost: chemical.packageCost,
      } satisfies PricingLineItem;
    });

  const laborCalc = calculateLaborCost({
    setupTime: input.setupTime,
    timePer1000: input.timePer1000,
    area: input.area,
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
      minutes: input.travelOverrideMinutes,
      amount: input.travelOverrideAmount,
    },
  });

  const tierRule = findTierRule(input.tierRules, input.propertyType, input.area);

  const preCost =
    materials.reduce((sum, item) => sum + item.amount, 0) + laborCalc.laborCost + travelCalc.travelCost;

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
    area: input.area,
  });

  const subtotal = priceCalc.discounted;
  const tax = subtotal * input.taxRate;
  const lineItems: PricingLineItem[] = [
    ...materials,
    {
      kind: 'labor',
      label: 'Labor',
      amount: laborCalc.laborCost,
      qty: laborCalc.laborHours,
      unit: 'hours',
      unitCost: input.hourlyWage,
    },
    {
      kind: 'travel',
      label: 'Travel',
      amount: travelCalc.travelCost,
      qty: travelCalc.minutes,
      unit: 'minutes',
      unitCost: (input.hourlyWage * (1 + input.burdenPercent)) / 60,
      isOverride: Boolean(input.travelOverrideAmount || input.travelOverrideMinutes),
      overrideReason: input.travelOverrideAmount ? 'Manual travel override' : undefined,
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
    input,
    propertyMultiplier,
    laborCalc,
    travelCalc,
    priceCalc,
    tierRule,
  } satisfies Record<string, unknown>;

  return {
    lineItems,
    subtotal,
    tax,
    total,
    snapshot,
  };
}
