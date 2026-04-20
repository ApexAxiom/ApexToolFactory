import { describe, expect, it } from "vitest";
import { calculatePricing, roundMoney } from "@/domain/pricing";
import { QuoteDraftPayload } from "@/domain/types";

function makePayload(overrides: Partial<QuoteDraftPayload> = {}): QuoteDraftPayload {
  return {
    customerName: "Acme Pest Control",
    propertyAddress: "123 Main St",
    propertySquareFootage: 2000,
    visitType: "QUARTERLY",
    pestFindings: [
      { code: "termite", label: "Termite treatment", amount: 250 },
      { code: "rodent", label: "Rodent exclusion", amount: 180 }
    ],
    serviceScope: "Exterior treatment and interior inspection.",
    pricing: {
      baseRatePerSqft: 0.06,
      laborHours: 2,
      laborRate: 85,
      materials: 25,
      travel: 15,
      markupPercent: 15,
      taxPercent: 8.25
    },
    ...overrides
  };
}

describe("calculatePricing", () => {
  it("calculates subtotal, tax, grand total, and key line items", () => {
    const result = calculatePricing(makePayload());

    expect(result.subtotal).toBe(853.3);
    expect(result.taxTotal).toBe(70.4);
    expect(result.grandTotal).toBe(923.7);
    expect(result.lineItems.map((line) => line.category)).toEqual([
      "BASE",
      "LABOR",
      "MATERIALS",
      "TRAVEL",
      "PEST",
      "PEST",
      "MARKUP"
    ]);
  });

  it("uses the monthly multiplier and omits optional charge lines when zero", () => {
    const result = calculatePricing(
      makePayload({
        visitType: "MONTHLY",
        pestFindings: [],
        pricing: {
          baseRatePerSqft: 0.06,
          laborHours: 1.5,
          laborRate: 85,
          materials: 0,
          travel: 0,
          markupPercent: 10,
          taxPercent: 0
        }
      })
    );

    expect(result.subtotal).toBe(239.25);
    expect(result.taxTotal).toBe(0);
    expect(result.grandTotal).toBe(239.25);
    expect(result.lineItems.map((line) => line.category)).toEqual(["BASE", "LABOR", "MARKUP"]);
  });
});

describe("roundMoney", () => {
  it("rounds floating point values to cents", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });
});
