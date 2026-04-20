import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";
import { viewInvoiceInPortal } from "@/server/services/invoices";

export default async function InvoicePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const requestHeaders = await headers();
  const viewed = await viewInvoiceInPortal({
    token,
    ip: getRequestIp(requestHeaders),
    userAgent: getUserAgent(requestHeaders)
  }).catch(() => null);
  if (!viewed?.invoice) notFound();
  const invoice = viewed.invoice;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Invoice portal</p>
        <h1 className="mt-2 text-3xl font-semibold">{invoice.invoiceNumber}</h1>
        <p className="mt-2 text-sm text-ink/65">
          Due {dateOnly(invoice.dueDate)} • Status {invoice.status}
        </p>
        <div className="mt-6 rounded-2xl bg-canvas p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Outstanding balance</div>
          <div className="mt-2 text-4xl font-semibold">{currency(invoice.outstandingTotal)}</div>
        </div>
        {invoice.stripeHostedInvoiceUrl ? (
          <a
            href={invoice.stripeHostedInvoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white"
          >
            Pay invoice
          </a>
        ) : (
          <p className="mt-6 text-sm text-ink/65">
            Online payment is not configured yet for this invoice. Please contact the sender for payment arrangements.
          </p>
        )}
      </Panel>
    </main>
  );
}
