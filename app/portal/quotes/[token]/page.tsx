import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { Quote, QuoteRevision, QuoteLine } from "@/domain/types";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";
import { viewQuoteInPortal } from "@/server/services/quotes";

export default async function QuotePortalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accepted?: string; declined?: string }>;
}) {
  const { token } = await params;
  const { accepted, declined } = await searchParams;
  const requestHeaders = await headers();
  const viewed = await viewQuoteInPortal({
    token,
    ip: getRequestIp(requestHeaders),
    userAgent: getUserAgent(requestHeaders)
  }).catch(() => null);
  if (!viewed) notFound();

  const [quote, revision, lines] = await Promise.all([
    getStore().get<Quote>("quotes", viewed.quote.id),
    getStore().list<QuoteRevision>("quoteRevisions", { quoteId: viewed.quote.id }),
    getStore().list<QuoteLine>("quoteLines", { quoteId: viewed.quote.id })
  ]);
  if (!quote || !revision[0]) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Customer portal</p>
        <h1 className="mt-2 text-3xl font-semibold">Quote {quote.quoteNumber}</h1>
        <p className="mt-2 text-sm text-ink/65">
          {quote.customerNameSnapshot} • expires {dateOnly(quote.expiresAt)}
        </p>
        {accepted ? <div className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">Quote accepted successfully.</div> : null}
        {declined ? <div className="mt-4 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">Quote declined.</div> : null}
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-xl font-semibold">Scope</h2>
        <p className="mt-4 text-sm leading-7 text-ink/80">{revision[0].payload.serviceScope}</p>
        <div className="mt-5 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-3 text-sm">
              <span>{line.description}</span>
              <span>{currency(line.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 text-right text-2xl font-semibold">{currency(quote.grandTotal)}</div>
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-xl font-semibold">Respond</h2>
        <form action={`/api/portal/quotes/${token}/accept`} method="post" className="mt-5 grid gap-4">
          <label className="space-y-2 text-sm font-medium">
            Typed full name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="acceptedByName" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Email
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="acceptedByEmail" type="email" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Accept quote</button>
            <button
              formAction={`/api/portal/quotes/${token}/decline`}
              className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink"
            >
              Decline
            </button>
          </div>
        </form>
        <Link href="/" className="mt-5 inline-block text-sm text-ink/60 underline underline-offset-4">
          Return to Pestimator
        </Link>
      </Panel>
    </main>
  );
}
