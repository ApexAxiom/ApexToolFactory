import Card from "@/components/Card";
import Link from "next/link";

/**
 * Server component rendering the dashboard landing page.
 * @returns Dashboard view with navigation shortcuts.
 * @example
 * ```tsx
 * export default async function Page() {
 *   return <Home />;
 * }
 * ```
 */
export default async function Home() {
  return (
    <main className="max-w-5xl mx-auto p-6 grid gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="grid gap-4">
          <div>
            <h2 className="font-semibold mb-1">Quotes</h2>
            <p className="text-slate-600 text-sm">Create new quotes or review existing drafts.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/quotes/new">Create quote</Link>
            <Link className="btn" href="/quotes">Browse quotes</Link>
          </div>
        </Card>
        <Card className="grid gap-4">
          <div>
            <h2 className="font-semibold mb-1">Invoices</h2>
            <p className="text-slate-600 text-sm">Generate invoices or convert quotes.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/invoices/new">Create invoice</Link>
            <Link className="btn" href="/invoices">Browse invoices</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
