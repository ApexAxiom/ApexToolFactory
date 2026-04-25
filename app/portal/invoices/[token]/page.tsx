import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { BrandMark } from "@/components/ui/brand";
import { StatusPill } from "@/components/ui/status-pill";
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
    <main className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <BrandMark />
          <span className="text-sm font-semibold text-muted">Secure invoice portal</span>
        </div>
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Invoice</p>
              <h1 className="mt-2 text-3xl font-semibold">{invoice.invoiceNumber}</h1>
              <p className="mt-2 text-sm text-muted">Due {dateOnly(invoice.dueDate)}</p>
            </div>
            <StatusPill status={invoice.status} />
          </div>
          <div className="mt-6 rounded-lg bg-mist p-5">
            <div className="text-xs font-semibold uppercase text-muted">Outstanding balance</div>
            <div className="mt-2 text-4xl font-semibold text-emerald">{currency(invoice.outstandingTotal)}</div>
          </div>
          {invoice.stripeHostedInvoiceUrl ? (
            <a
              href={invoice.stripeHostedInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-emerald px-5 text-sm font-semibold text-white hover:bg-[#0b7d63]"
            >
              <CreditCard className="h-4 w-4" />
              Pay invoice
            </a>
          ) : (
            <p className="mt-6 rounded-lg border border-line bg-canvas p-4 text-sm leading-6 text-muted">
              Online payment is not configured yet for this invoice. Please contact the sender for payment arrangements.
            </p>
          )}
        </Panel>
      </div>
    </main>
  );
}
