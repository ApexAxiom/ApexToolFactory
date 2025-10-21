import Card from "@/components/Card";

async function getQuote(id:string){
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/quotes/${id}`, { cache: "no-store" });
  if (!r.ok) return null; return r.json();
}

/**
 * Server component showing details for a single quote.
 * @param params - Dynamic route params including quote id.
 * @returns Quote detail view or not-found message.
 * @example
 * ```tsx
 * export default async function Page({ params }: { params: { id: string } }) {
 *   return <QuoteDetail params={params} />;
 * }
 * ```
 */
export default async function QuoteDetail({ params }:{ params:{ id:string }}) {
  const q = await getQuote(params.id);
  if (!q) return <main className="max-w-3xl mx-auto p-6"><Card>Quote not found.</Card></main>;
  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-4">
      <Card><h1 className="text-xl font-semibold">{q.number}</h1><div className="text-slate-600">{q.customerId}</div></Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className="text-left">Qty</th><th className="text-left">Unit</th><th className="text-right">Line</th></tr></thead>
          <tbody>
            {q.items.map((it:any,i:number)=>(<tr key={i}><td>{it.qty}</td><td>${it.unitPrice.toFixed(2)}</td><td className="text-right">${it.lineTotal.toFixed(2)}</td></tr>))}
          </tbody>
        </table>
      </Card>
      <Card className="flex justify-end gap-6">
        <div>Subtotal <b>${q.subtotal.toFixed(2)}</b></div>
        <div>Tax <b>${q.tax.toFixed(2)}</b></div>
        <div>Total <b>${q.total.toFixed(2)}</b></div>
      </Card>
    </main>
  );
}
