import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getInvoice, getInvoiceLines } from "@/server/services/invoices";
import { sendInvoiceAction } from "@/server/actions/app";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice || invoice.organizationId !== context.organization.id) notFound();

  const lines = await getInvoiceLines(invoice.id, context.organization.id);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Invoice</p>
            <h1 className="mt-2 text-3xl font-semibold">{invoice.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {invoice.status} • issued {dateOnly(invoice.issueDate)} • due {dateOnly(invoice.dueDate)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-ink/55">Outstanding</div>
            <div className="text-3xl font-semibold">{currency(invoice.outstandingTotal)}</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-xl font-semibold">Line items</h2>
          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between rounded-2xl border border-ink/10 px-4 py-3 text-sm">
                <span>{line.description}</span>
                <span>{currency(line.lineTotal)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Send invoice</h2>
          <form action={sendInvoiceAction} className="mt-5 space-y-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="space-y-2 text-sm font-medium">
              Recipient email
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="recipientEmail" type="email" required />
            </label>
            <button className="w-full rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Send invoice email</button>
          </form>

          {invoice.stripeHostedInvoiceUrl ? (
            <a
              href={invoice.stripeHostedInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-full border border-ink/10 px-5 py-3 text-center text-sm font-semibold text-ink"
            >
              Open hosted payment page
            </a>
          ) : (
            <div className="mt-4 rounded-2xl bg-canvas p-4 text-sm text-ink/75">
              Stripe hosted payment links are created when Stripe is configured and the invoice is synced.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
