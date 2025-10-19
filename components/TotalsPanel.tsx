/**
 * Summarizes subtotal, tax, and total for a quote preview.
 * @param subtotal - Combined line item amount before tax.
 * @param tax - Tax amount calculated for the quote.
 * @param total - Total cost including tax.
 * @returns Card element showing formatted currency totals.
 * @example
 * ```tsx
 * <TotalsPanel subtotal={100} tax={8.25} total={108.25} />
 * ```
 */
export function TotalsPanel({subtotal,tax,total}:{subtotal:number;tax:number;total:number}) {
  const fmt = (n:number)=>n.toLocaleString(undefined,{style:'currency',currency:'USD'});
  return (
    <div className="card p-4 flex gap-6">
      <div>Subtotal: <b>{fmt(subtotal)}</b></div>
      <div>Tax: <b>{fmt(tax)}</b></div>
      <div>Total: <b>{fmt(total)}</b></div>
    </div>
  );
}
