import { describe, expect, it } from 'vitest';
import { runPricingEngine } from '@/lib/pricing/engine';
import { calculatePrice } from '@/lib/pricing/formulas';
import { applyRounding } from '@/lib/pricing/rules';
import { applyRoundingRule } from '@/lib/pricing/round';
import { PricingInputSchema } from '@/lib/pricing/schema';

const baseInput = {
  propertyType: 'Residential' as const,
  area: 1800,
  infestationMultiplier: 1,
  complexityMultiplier: 1,
  interior: true,
  exterior: true,
  chemicals: [
    {
      id: 'chem1',
      name: 'Bifenthrin 7.9%',
      usageRatePer1000: 3.2,
      packageSize: 1,
      packageCost: 85,
      wastePercent: 0.05,
      useFor: 'both' as const,
    },
  ],
  setupTime: 0.5,
  timePer1000: 0.35,
  hourlyWage: 22,
  burdenPercent: 0.28,
  travelFixedMinutes: 15,
  travelMinutesPerMile: 1.5,
  travelMiles: 10,
  manualLaborAdderHours: 0,
  mode: 'margin' as const,
  marginOrMarkup: 0.45,
  fees: 0,
  discounts: 0,
  taxRate: 0.0825,
  roundingRule: 'nearest_5' as const,
  minimum: 95,
  tierRules: [
    { propertyType: 'Residential', fromArea: 0, toArea: 1500, priceFloor: null, pricePer1000Override: null },
    { propertyType: 'Residential', fromArea: 1501, toArea: 2500, priceFloor: 125, pricePer1000Override: null },
    { propertyType: 'Residential', fromArea: 2501, toArea: 4000, priceFloor: 165, pricePer1000Override: null },
  ],
  template: {
    residentialMultiplier: 1,
    commercialMultiplier: 1.15,
    defaultInfestationMultiplier: 1,
    defaultComplexityMultiplier: 1,
    minPrice: 95,
    mainUnit: 'ft2' as const,
  },
  currency: 'USD',
  unitsArea: 'ft2' as const,
};

describe('pricing engine', () => {
  it('computes base residential general pest', () => {
    const result = runPricingEngine(baseInput);
    expect(result.total).toBeGreaterThan(200);
    expect(result.lineItems.find((item) => item.kind === 'labor')?.amount).toBeGreaterThan(0);
  });

  it('applies tier override for commercial property', () => {
    const result = runPricingEngine({
      ...baseInput,
      propertyType: 'Commercial',
      area: 4500,
      template: { ...baseInput.template, minPrice: 95 },
      tierRules: [
        ...baseInput.tierRules,
        { propertyType: 'Commercial', fromArea: 4000, toArea: null, priceFloor: 400, pricePer1000Override: 95 },
      ],
    });
    expect(result.total).toBeGreaterThan(400);
  });

  it('margin vs markup equivalence', () => {
    const preCost = 100;
    const margin = calculatePrice({
      preCost,
      mode: 'margin',
      marginOrMarkup: 0.5,
      fees: 0,
      discounts: 0,
      taxRate: 0,
      roundingRule: 'nearest_1',
      minimum: 0,
      tierRule: null,
      propertyType: 'Residential',
      area: 1000,
    });
    const markup = calculatePrice({
      preCost,
      mode: 'markup',
      marginOrMarkup: 1,
      fees: 0,
      discounts: 0,
      taxRate: 0,
      roundingRule: 'nearest_1',
      minimum: 0,
      tierRule: null,
      propertyType: 'Residential',
      area: 1000,
    });
    expect(margin.priceBeforeAdjustments).toBeCloseTo(markup.priceBeforeAdjustments, 2);
  });

  it('rounds to nearest $5', () => {
    const rounded = applyRounding(122.4, 'nearest_5');
    expect(rounded).toBe(120);
  });

  it('rounds with helper alias', () => {
    const rounded = applyRoundingRule(101.23, 'psychological_9');
    expect(rounded).toBe(109);
  });

  it('respects manual labor override hours', () => {
    const result = runPricingEngine({
      ...baseInput,
      manualLaborAdderHours: 3,
    });
    const laborItem = result.lineItems.find((item) => item.kind === 'labor');
    expect(laborItem?.qty).toBeGreaterThan(3);
  });

  it('enforces minimum price on tiny area', () => {
    const result = runPricingEngine({
      ...baseInput,
      area: 100,
    });
    expect(result.total).toBeGreaterThanOrEqual(95);
  });

  it('handles interior vs exterior flags', () => {
    const result = runPricingEngine({
      ...baseInput,
      interior: false,
      exterior: true,
    });
    const materials = result.lineItems.filter((item) => item.kind === 'materials');
    expect(materials.length).toBe(1);
  });

  it('rejects negative area via schema', () => {
    expect(() => PricingInputSchema.parse({ ...baseInput, area: -10 })).toThrow();
  });

  it('computes linear footage template', () => {
    const result = runPricingEngine({
      ...baseInput,
      area: 300,
      template: {
        residentialMultiplier: 1,
        commercialMultiplier: 1.15,
        defaultInfestationMultiplier: 1,
        defaultComplexityMultiplier: 1,
        minPrice: 175,
        mainUnit: 'linear_ft' as const,
      },
      chemicals: baseInput.chemicals,
      tierRules: [],
    });
    expect(result.total).toBeGreaterThanOrEqual(175);
  });
});
