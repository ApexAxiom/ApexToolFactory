import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getQuote, getQuoteLines, getQuoteRevision } from "@/server/services/quotes";
import { issueInvoiceAction, sendQuoteAction } from "@/server/actions/app";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote || quote.organizationId !== context.organization.id) notFound();

  const [revision, lines] = await Promise.all([
    getQuoteRevision(quote.currentRevisionId),
    getQuoteLines(quote.id, context.organization.id)
  ]);

  if (!revision) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/quotes" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald">
          <ArrowLeft className="h-4 w-4" />
          Back to quotes
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{quote.quoteNumber}</span>
          <StatusPill status={quote.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Client", quote.customerNameSnapshot],
                ["Property", quote.serviceAddressSnapshot],
                ["Created", dateOnly(quote.createdAt)],
                ["Total", currency(quote.grandTotal)]
              ].map(([label, value], index) => (
                <div key={label} className={index === 0 ? "" : "md:border-l md:border-line md:pl-5"}>
                  <div className="text-xs font-semibold text-muted">{label}</div>
                  <div className="mt-1 text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald" />
              <div>
                <h2 className="text-lg font-semibold">Scope and pricing</h2>
                <p className="text-sm text-muted">Proposal text, services, and calculated line items.</p>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-4 text-sm leading-7 text-ink/80">
              {revision.payload.serviceScope}
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3 text-right">Unit</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-semibold">{line.description}</td>
                      <td className="px-4 py-3 text-muted">{line.qty}</td>
                      <td className="px-4 py-3 text-right text-muted">{currency(line.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currency(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-white p-5 shadow-subtle xl:sticky xl:top-28">
          <h2 className="text-lg font-semibold">Send and convert</h2>
          <p className="mt-1 text-sm text-muted">Create a secure portal link and email a professional proposal.</p>
          <form action={sendQuoteAction} className="mt-5 space-y-3">
            <input type="hidden" name="quoteId" value={quote.id} />
            <label className="block space-y-2 text-sm font-semibold">
              Recipient email
              <input className={`${inputClass} w-full`} name="recipientEmail" defaultValue="" type="email" required />
            </label>
            <Button className="w-full">
              <Send className="h-4 w-4" />
              Send quote email
            </Button>
          </form>

          <form action={issueInvoiceAction} className="mt-3">
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button className="w-full" variant="secondary">Convert to invoice</Button>
          </form>

          <div className="mt-5 rounded-lg bg-mist p-4 text-sm text-muted">
            <div className="font-semibold text-ink">Portal-ready</div>
            <p className="mt-2 leading-6">
              Sending this quote creates a secure review link. Customers can accept it without logging in, and acceptance is recorded with timestamp and request metadata.
            </p>
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-3xl font-semibold text-emerald">{currency(quote.grandTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
