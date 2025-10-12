import type { PropertyType, RoundingRule, TierRule } from './rules';
import { applyRounding } from './rules';

export interface MaterialInput {
  usageRatePer1000: number;
  area: number;
  infestationMultiplier: number;
  interiorExteriorFactor: number;
  packageSize: number;
  packageCost: number;
  wastePercent: number;
}

export interface LaborInput {
  setupTime: number;
  timePer1000: number;
  area: number;
  complexityMultiplier: number;
  manualAdders: number;
  hourlyWage: number;
  burdenPercent: number;
}

export interface TravelInput {
  fixedMinutes: number;
  minutesPerMile: number;
  miles: number;
  hourlyWage: number;
  burdenPercent: number;
  overrides?: {
    minutes?: number;
    amount?: number;
  };
}

export interface PriceInput {
  preCost: number;
  mode: 'margin' | 'markup';
  marginOrMarkup: number;
  fees: number;
  discounts: number;
  taxRate: number;
  roundingRule: RoundingRule;
  minimum: number;
  tierRule?: TierRule | null;
  propertyType: PropertyType;
  area: number;
}

export function calculateMaterialCost(input: MaterialInput) {
  const usageQty =
    (input.usageRatePer1000 * (input.area / 1000)) * input.infestationMultiplier * input.interiorExteriorFactor;
  const materialCost = (usageQty / input.packageSize) * input.packageCost * (1 + input.wastePercent);
  return { usageQty, materialCost };
}

export function calculateLaborCost(input: LaborInput) {
  const laborHours =
    input.setupTime + (input.timePer1000 * (input.area / 1000)) * input.complexityMultiplier + input.manualAdders;
  const laborCost = laborHours * input.hourlyWage * (1 + input.burdenPercent);
  return { laborHours, laborCost };
}

export function calculateTravelCost(input: TravelInput) {
  const minutes = input.overrides?.minutes ?? input.fixedMinutes + input.minutesPerMile * input.miles;
  const hourlyRate = input.hourlyWage * (1 + input.burdenPercent);
  const travelCost = input.overrides?.amount ?? ((minutes / 60) * hourlyRate);
  return { minutes, travelCost };
}

export function calculatePrice(input: PriceInput) {
  const tierOverride = input.tierRule?.pricePer1000Override ?? null;
  const priceBeforeAdjustments =
    input.mode === 'margin'
      ? input.preCost / (1 - input.marginOrMarkup)
      : input.preCost * (1 + input.marginOrMarkup);
  const tierAdjustment = tierOverride ? (input.area / 1000) * tierOverride : 0;
  const minimumApplied = Math.max(priceBeforeAdjustments, tierAdjustment, input.minimum, input.tierRule?.priceFloor ?? 0);
  const discounted = minimumApplied - input.discounts + input.fees;
  const taxed = discounted * (1 + input.taxRate);
  const rounded = applyRounding(taxed, input.roundingRule);
  return { priceBeforeAdjustments, tierAdjustment, minimumApplied, discounted, taxed, rounded };
}
