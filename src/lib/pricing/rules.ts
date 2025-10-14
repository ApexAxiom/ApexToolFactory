import { applyRoundingRule } from './round';

export type PropertyType = 'Residential' | 'Commercial';
export type RoundingRule = 'nearest_1' | 'nearest_5' | 'psychological_9';

export interface TierRule {
  propertyType: PropertyType;
  fromArea: number;
  toArea: number | null;
  priceFloor?: number | null;
  pricePer1000Override?: number | null;
}

export interface TemplateMultipliers {
  residentialMultiplier: number;
  commercialMultiplier: number;
  defaultInfestationMultiplier: number;
  defaultComplexityMultiplier: number;
}

export function findTierRule(rules: TierRule[], propertyType: PropertyType, area: number): TierRule | null {
  return (
    rules.find((rule) => {
      if (rule.propertyType !== propertyType) return false;
      const minOk = area >= rule.fromArea;
      const maxOk = rule.toArea == null ? true : area <= rule.toArea;
      return minOk && maxOk;
    }) ?? null
  );
}

export function resolvePropertyMultiplier(
  multipliers: TemplateMultipliers,
  propertyType: PropertyType,
): number {
  return propertyType === 'Residential' ? multipliers.residentialMultiplier : multipliers.commercialMultiplier;
}

/**
 * Applies the rounding strategy selected for a quote.
 * @param value The numeric value to round.
 * @param rule The rounding rule identifier.
 * @returns The rounded amount.
 * @example
 * const rounded = applyRounding(122.4, 'nearest_5');
 */
export function applyRounding(value: number, rule: RoundingRule): number {
  return applyRoundingRule(value, rule);
}

export { applyRoundingRule };
