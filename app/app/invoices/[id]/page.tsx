import { notFound } from "next/navigation";
import { Banknote, Send } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { hasPermission } from "@/server/auth/permissions";
import { getInvoice, getInvoiceLines } from "@/server/services/invoices";
import { recordManualPaymentAction, sendInvoiceAction } from "@/server/actions/app";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice || invoice.organizationId !== context.organization.id) notFound();

  const lines = await getInvoiceLines(invoice.id, context.organization.id);
  const canRecordPayments = hasPermission(context.membership, "payments:record");
  const isPayable = invoice.outstandingTotal > 0 && invoice.status !== "VOID";

  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["Invoice", invoice.invoiceNumber],
            ["Status", <StatusPill key="status" status={invoice.status} />],
            ["Issued", dateOnly(invoice.issueDate)],
            ["Due", dateOnly(invoice.dueDate)],
            ["Outstanding", currency(invoice.outstandingTotal)]
          ].map(([label, value], index) => (
            <div key={label as string} className={index === 0 ? "" : "md:border-l md:border-line md:pl-5"}>
              <div className="text-xs font-semibold text-muted">{label}</div>
              <div className="mt-1 text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <h2 className="text-lg font-semibold">Line items</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Description</th>
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

        <aside className="h-fit rounded-lg border border-line bg-white p-5 shadow-subtle xl:sticky xl:top-28">
          <h2 className="text-lg font-semibold">Send invoice</h2>
          <p className="mt-1 text-sm text-muted">Email a secure portal link and collect with Stripe when configured.</p>
          <form action={sendInvoiceAction} className="mt-5 space-y-3">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <label className="block space-y-2 text-sm font-semibold">
              Recipient email
              <input className={`${inputClass} w-full`} name="recipientEmail" type="email" required />
            </label>
            <SubmitButton className="w-full" pendingText="Sending...">
              <Send className="h-4 w-4" />
              Send invoice email
            </SubmitButton>
          </form>

          {canRecordPayments && isPayable ? (
            <div className="mt-6 border-t border-line pt-5">
              <h2 className="text-lg font-semibold">Record a payment</h2>
              <p className="mt-1 text-sm text-muted">For cash, check, or other offline payments.</p>
              <form action={recordManualPaymentAction} className="mt-4 space-y-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2 text-sm font-semibold">
                    Amount
                    <input
                      className={`${inputClass} w-full`}
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={invoice.outstandingTotal}
                      defaultValue={invoice.outstandingTotal.toFixed(2)}
                      required
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Method
                    <select className={`${inputClass} w-full`} name="method" defaultValue="check">
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="ach">ACH / bank</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-semibold">
                  Reference
                  <input className={`${inputClass} w-full`} name="reference" placeholder="Check #, confirmation..." />
                </label>
                <SubmitButton className="w-full" variant="secondary" pendingText="Recording...">
                  <Banknote className="h-4 w-4" />
                  Record payment
                </SubmitButton>
              </form>
            </div>
          ) : null}

          {invoice.stripeHostedInvoiceUrl ? (
            <a
              href={invoice.stripeHostedInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex h-10 items-center justify-center rounded-md border border-line text-sm font-semibold text-ink hover:bg-canvas"
            >
              Open hosted payment page
            </a>
          ) : (
            <div className="mt-4 rounded-lg bg-mist p-4 text-sm leading-6 text-muted">
              Stripe hosted payment links are created when Stripe is configured and the invoice is synced.
            </div>
          )}
          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <span className="font-semibold">Balance</span>
            <span className="text-3xl font-semibold text-emerald">{currency(invoice.outstandingTotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
