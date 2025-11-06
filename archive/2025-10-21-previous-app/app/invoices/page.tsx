import Card from "@/components/Card";
import type { InvoiceIndexRow } from "@/lib/types";

export default async function Invoices() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const r = await fetch(`${base}/api/invoices`, { cache: "no-store" });
  const rows: InvoiceIndexRow[] = r.ok ? await r.json() as InvoiceIndexRow[] : [];

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Invoices</h1>
      <div className="grid gap-3">
        {rows.map((row) => (
          <a key={row.id} href={`/invoices/${row.id}`} className="card p-4 flex justify-between">
            <div>
              <b>{row.number}</b> — {row.customerName}
            </div>
            <div>${row.total.toFixed(2)}</div>
          </a>
        ))}
        {rows.length === 0 && <Card>No invoices yet.</Card>}
      </div>
    </main>
  );
}
