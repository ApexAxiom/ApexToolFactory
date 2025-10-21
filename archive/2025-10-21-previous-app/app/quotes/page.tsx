import Card from "@/components/Card";

interface Row { id:string; number:string; customerName:string; createdAt:string; total:number; }

/**
 * Lists recent quotes for the authenticated organization.
 * @returns Server-rendered quote list view.
 * @example
 * ```tsx
 * export default async function Page() {
 *   return <Quotes />;
 * }
 * ```
 */
export default async function Quotes() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const r = await fetch(`${base}/api/quotes`, { cache: "no-store" });
  const rows: Row[] = r.ok ? await r.json() : [];
  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Quotes</h1>
      <div className="grid gap-3">
        {rows.map(row=>(
          <a key={row.id} href={`/quotes/${row.id}`} className="card p-4 flex justify-between">
            <div><b>{row.number}</b> — {row.customerName}</div>
            <div>${row.total.toFixed(2)}</div>
          </a>
        ))}
        {rows.length===0 && <Card>No quotes yet.</Card>}
      </div>
    </main>
  );
}
