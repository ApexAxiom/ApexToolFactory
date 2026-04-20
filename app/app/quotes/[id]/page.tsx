import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getQuote, getQuoteLines, getQuoteRevision } from "@/server/services/quotes";
import { issueInvoiceAction, sendQuoteAction } from "@/server/actions/app";

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
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Quote</p>
            <h1 className="mt-2 text-3xl font-semibold">{quote.quoteNumber}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {quote.customerNameSnapshot} • {quote.status} • {dateOnly(quote.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-ink/55">Total</div>
            <div className="text-3xl font-semibold">{currency(quote.grandTotal)}</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-xl font-semibold">Scope and pricing</h2>
          <div className="mt-4 rounded-2xl bg-canvas p-4 text-sm leading-7 text-ink/80">{revision.payload.serviceScope}</div>
          <div className="mt-5 space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-3 text-sm">
                <span>{line.description}</span>
                <span>{currency(line.lineTotal)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Send and convert</h2>
          <form action={sendQuoteAction} className="mt-5 space-y-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <label className="space-y-2 text-sm font-medium">
              Recipient email
              <input
                className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3"
                name="recipientEmail"
                defaultValue=""
                type="email"
                required
              />
            </label>
            <button className="w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Send quote email</button>
          </form>

          <form action={issueInvoiceAction} className="mt-4">
            <input type="hidden" name="quoteId" value={quote.id} />
            <button className="w-full rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink">
              Issue invoice from quote
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-canvas p-4 text-sm text-ink/75">
            <div className="font-semibold text-ink">Portal-ready</div>
            <p className="mt-2">
              Sending this quote creates a secure review link. Customers can accept it without logging in, and acceptance is recorded with timestamp and request metadata.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
