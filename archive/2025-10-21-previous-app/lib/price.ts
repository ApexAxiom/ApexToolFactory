import { LineItem } from "./types";

/**
 * Calculates subtotal, tax, and total for provided line items.
 * @param items - Array of objects containing unit price and quantity per line.
 * @returns Totals object containing subtotal, tax, and total.
 * @example
 * ```ts
 * const totals = priceItems([{ unitPrice: 50, qty: 2 }]);
 * ```
 */
export function priceItems(items: {unitPrice:number; qty:number}[]): {subtotal:number; tax:number; total:number} {
  const subtotal = items.reduce((s,i)=>s + i.unitPrice * i.qty, 0);
  const tax = Math.round(subtotal * 0.0825 * 100) / 100; // 8.25% example; later read from org meta
  const total = Math.round((subtotal + tax) * 100)/100;
  return { subtotal, tax, total };
}

/**
 * Produces a quote line item with derived total.
 * @param unitPrice - Price per unit of service.
 * @param qty - Quantity of units sold.
 * @returns Quote line with computed line total.
 * @example
 * ```ts
 * const item = priceLine(25, 3);
 * ```
 */
export function priceLine(unitPrice:number, qty:number): LineItem {
  const lineTotal = Math.round(unitPrice * qty * 100)/100;
  return { templateId: "", qty, unitPrice, lineTotal };
}
