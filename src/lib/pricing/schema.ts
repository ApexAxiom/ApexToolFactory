import { z } from 'zod';

export const ChemicalItemSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  usageRatePer1000: z.number().nonnegative(),
  packageSize: z.number().positive(),
  packageUnit: z.enum(['oz', 'lb', 'gal', 'l', 'ml', 'kg', 'each']).default('each'),
  packageCost: z.number().nonnegative(),
  wastePercent: z.number().min(0).max(1).default(0),
  useFor: z.enum(['interior', 'exterior', 'both']).default('both'),
});

export const TierRuleSchema = z.object({
  propertyType: z.enum(['Residential', 'Commercial']),
  fromArea: z.number().nonnegative(),
  toArea: z.number().positive().nullable().default(null),
  priceFloor: z.number().nonnegative().nullable().default(null),
  pricePer1000Override: z.number().nonnegative().nullable().default(null),
});

export const TemplateSnapshotSchema = z.object({
  mainUnit: z.enum(['ft2', 'm2', 'linear_ft', 'each']).default('ft2'),
  minPrice: z.number().nonnegative().default(0),
  residentialMultiplier: z.number().positive().default(1),
  commercialMultiplier: z.number().positive().default(1),
  defaultInfestationMultiplier: z.number().positive().default(1),
  defaultComplexityMultiplier: z.number().positive().default(1),
});

/**
 * Shared validation schema for every pricing engine invocation.
 * @example
 * const parsed = PricingInputSchema.parse(payloadFromWizard);
 */
export const PricingInputSchema = z.object({
  propertyType: z.enum(['Residential', 'Commercial']),
  area: z.number().positive(),
  infestationMultiplier: z.number().positive().default(1),
  complexityMultiplier: z.number().positive().default(1),
  interior: z.boolean(),
  exterior: z.boolean(),
  chemicals: z.array(ChemicalItemSchema).default([]),
  setupTime: z.number().nonnegative(),
  timePer1000: z.number().nonnegative(),
  hourlyWage: z.number().nonnegative(),
  burdenPercent: z.number().min(0).max(1).default(0),
  travelFixedMinutes: z.number().nonnegative().default(0),
  travelMinutesPerMile: z.number().nonnegative().default(0),
  travelMiles: z.number().nonnegative().default(0),
  travelOverrideMinutes: z.number().nonnegative().optional(),
  travelOverrideAmount: z.number().nonnegative().optional(),
  travelOverrideReason: z.string().min(1).optional(),
  manualLaborAdderHours: z.number().nonnegative().default(0),
  manualLaborReason: z.string().min(1).optional(),
  mode: z.enum(['margin', 'markup']).default('margin'),
  marginOrMarkup: z.number().min(0).max(0.95).default(0.4),
  fees: z.number().nonnegative().default(0),
  discounts: z.number().nonnegative().default(0),
  taxRate: z.number().min(0).max(0.25).default(0),
  roundingRule: z.enum(['nearest_1', 'nearest_5', 'psychological_9']).default('nearest_1'),
  minimum: z.number().nonnegative().default(0),
  tierRules: z.array(TierRuleSchema).default([]),
  template: TemplateSnapshotSchema,
  currency: z.enum(['USD', 'EUR']).default('USD'),
  unitsArea: z.enum(['ft2', 'm2']).default('ft2'),
});

export type PricingInput = z.infer<typeof PricingInputSchema>;
