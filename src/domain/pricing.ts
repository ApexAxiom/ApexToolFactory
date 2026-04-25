import { QuoteDraftPayload } from "@/domain/types";

const visitMultipliers: Record<QuoteDraftPayload["visitType"], number> = {
  ONE_TIME: 1,
  MONTHLY: 0.75,
  QUARTERLY: 0.85
};

export interface PricingResult {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  lineItems: Array<{
    category: string;
    description: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    taxable: boolean;
  }>;
}

export function calculatePricing(payload: QuoteDraftPayload): PricingResult {
  if (payload.lineItems?.length) {
    const lineItems = payload.lineItems.map((line) => ({
      category: line.category || "SERVICE",
      description: line.description,
      qty: line.qty,
      unitPrice: roundMoney(line.unitPrice),
      lineTotal: roundMoney(line.lineTotal),
      taxable: line.taxable ?? true
    }));
    const subtotal = roundMoney(lineItems.reduce((sum, line) => sum + line.lineTotal, 0));
    const taxableSubtotal = roundMoney(lineItems.filter((line) => line.taxable).reduce((sum, line) => sum + line.lineTotal, 0));
    const taxTotal = roundMoney(taxableSubtotal * (payload.pricing.taxPercent / 100));
    return {
      subtotal,
      taxTotal,
      grandTotal: roundMoney(subtotal + taxTotal),
      lineItems
    };
  }

  const sqft = Number(payload.propertySquareFootage ?? 0);
  const pricing = payload.pricing;
  const visitMultiplier = visitMultipliers[payload.visitType];

  const base = sqft * pricing.baseRatePerSqft * visitMultiplier;
  const labor = pricing.laborHours * pricing.laborRate;
  const findingsTotal = payload.pestFindings.reduce((sum, finding) => sum + Number(finding.amount || 0), 0);
  const preMarkup = base + labor + pricing.materials + pricing.travel + findingsTotal;
  const subtotal = roundMoney(preMarkup + preMarkup * (pricing.markupPercent / 100));
  const taxTotal = roundMoney(subtotal * (pricing.taxPercent / 100));
  const grandTotal = roundMoney(subtotal + taxTotal);

  const lineItems = [
    {
      category: "BASE",
      description: `${payload.visitType.replace("_", " ")} service coverage`,
      qty: Math.max(1, sqft || 1),
      unitPrice: roundMoney(pricing.baseRatePerSqft * visitMultiplier),
      lineTotal: roundMoney(base),
      taxable: true
    },
    {
      category: "LABOR",
      description: "Labor",
      qty: pricing.laborHours,
      unitPrice: pricing.laborRate,
      lineTotal: roundMoney(labor),
      taxable: true
    }
  ];

  if (pricing.materials > 0) {
    lineItems.push({
      category: "MATERIALS",
      description: "Materials",
      qty: 1,
      unitPrice: pricing.materials,
      lineTotal: roundMoney(pricing.materials),
      taxable: true
    });
  }

  if (pricing.travel > 0) {
    lineItems.push({
      category: "TRAVEL",
      description: "Travel",
      qty: 1,
      unitPrice: pricing.travel,
      lineTotal: roundMoney(pricing.travel),
      taxable: true
    });
  }

  payload.pestFindings.forEach((finding) => {
    lineItems.push({
      category: "PEST",
      description: finding.label,
      qty: 1,
      unitPrice: roundMoney(finding.amount),
      lineTotal: roundMoney(finding.amount),
      taxable: true
    });
  });

  if (pricing.markupPercent > 0) {
    lineItems.push({
      category: "MARKUP",
      description: `Markup (${pricing.markupPercent}%)`,
      qty: 1,
      unitPrice: roundMoney(subtotal - preMarkup),
      lineTotal: roundMoney(subtotal - preMarkup),
      taxable: false
    });
  }

  return {
    subtotal,
    taxTotal,
    grandTotal,
    lineItems
  };
}

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
