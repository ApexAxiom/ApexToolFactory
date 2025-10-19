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
      <div className="grid sm:grid-cols-3 gap-6">
        <Card><h2 className="font-semibold mb-2">New Quote</h2><Link className="btn btn-primary" href="/quotes/new">Start</Link></Card>
        <Card><h2 className="font-semibold mb-2">Quotes</h2><Link className="btn" href="/quotes">Browse</Link></Card>
        <Card><h2 className="font-semibold mb-2">Templates</h2><span className="text-slate-500">Coming soon</span></Card>
      </div>
    </main>
  );
}
