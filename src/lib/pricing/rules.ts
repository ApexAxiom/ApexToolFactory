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

export function applyRounding(value: number, rule: RoundingRule): number {
  switch (rule) {
    case 'nearest_1':
      return Math.round(value);
    case 'nearest_5':
      return Math.round(value / 5) * 5;
    case 'psychological_9':
      return Math.max(0, Math.floor(value / 10) * 10 + 9);
    default:
      return value;
  }
}
