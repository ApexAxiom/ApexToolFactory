import { describe, it, expect } from "vitest";
import { priceItems } from "../lib/price";

describe("priceItems", () => {
  it("adds lines and computes tax/total", () => {
    const r = priceItems([{unitPrice:100,qty:2},{unitPrice:50,qty:1}]);
    expect(r.subtotal).toBe(250);
    expect(r.tax).toBeCloseTo(20.63, 2);
    expect(r.total).toBeCloseTo(270.63, 2);
  });
});
