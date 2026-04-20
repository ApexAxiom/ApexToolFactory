import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listQuotes } from "@/server/services/quotes";

export default async function QuotesPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const quotes = await listQuotes(context.organization.id);

  return (
    <Panel>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Quotes</p>
          <h1 className="mt-2 text-3xl font-semibold">Sales pipeline</h1>
        </div>
        <Link href="/app/quotes/new" className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">
          New quote
        </Link>
      </div>
      <div className="space-y-3">
        {quotes.map((quote) => (
          <Link key={quote.id} href={`/app/quotes/${quote.id}`} className="block rounded-2xl border border-ink/10 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[1.1fr_0.8fr_0.6fr_0.5fr]">
              <div>
                <div className="font-medium">{quote.quoteNumber}</div>
                <div className="text-sm text-ink/65">{quote.customerNameSnapshot}</div>
              </div>
              <div className="text-sm text-ink/65">{dateOnly(quote.createdAt)}</div>
              <div className="text-sm font-medium">{currency(quote.grandTotal)}</div>
              <div className="text-sm text-right text-ink/65">{quote.status}</div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
