import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand";
import { currency, dateOnly } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { Quote, QuoteRevision, QuoteLine } from "@/domain/types";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";
import { viewQuoteInPortal } from "@/server/services/quotes";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

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

  const [quote, revisions, lines] = await Promise.all([
    getStore().get<Quote>("quotes", viewed.quote.id),
    getStore().list<QuoteRevision>("quoteRevisions", { quoteId: viewed.quote.id }),
    getStore().list<QuoteLine>("quoteLines", { quoteId: viewed.quote.id })
  ]);
  if (!quote || !revisions[0]) notFound();

  return (
    <main className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <BrandMark />
          <span className="text-sm font-semibold text-muted">Secure customer portal</span>
        </div>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Proposal review</p>
              <h1 className="mt-2 text-3xl font-semibold">Quote {quote.quoteNumber}</h1>
              <p className="mt-2 text-sm text-muted">
                {quote.customerNameSnapshot} / expires {dateOnly(quote.expiresAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted">Total</div>
              <div className="text-3xl font-semibold text-emerald">{currency(quote.grandTotal)}</div>
            </div>
          </div>
          {accepted ? <div className="mt-4 rounded-lg bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald">Quote accepted successfully.</div> : null}
          {declined ? <div className="mt-4 rounded-lg bg-clay/10 px-4 py-3 text-sm font-semibold text-clay">Quote declined.</div> : null}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald" />
              <h2 className="text-lg font-semibold">Scope and services</h2>
            </div>
            <p className="rounded-lg border border-line bg-white p-4 text-sm leading-7 text-ink/80">
              {revisions[0].payload.serviceScope}
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-semibold">{line.description}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <aside className="h-fit rounded-lg border border-line bg-white p-5 shadow-subtle">
            <h2 className="text-lg font-semibold">Respond</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Type your name to accept this proposal and create a timestamped acceptance record.</p>
            <form action={`/api/portal/quotes/${token}/accept`} method="post" className="mt-5 grid gap-3">
              <label className="space-y-2 text-sm font-semibold">
                Typed full name
                <input className={`${inputClass} w-full`} name="acceptedByName" required />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Email
                <input className={`${inputClass} w-full`} name="acceptedByEmail" type="email" />
              </label>
              <Button>
                <CheckCircle2 className="h-4 w-4" />
                Accept quote
              </Button>
              <Button formAction={`/api/portal/quotes/${token}/decline`} variant="secondary">
                Decline
              </Button>
            </form>
            <Link href="/" className="mt-5 inline-block text-sm font-semibold text-emerald">
              Return to Pestimator
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
