import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { currency } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listCustomers } from "@/server/services/customers";
import { listQuotes } from "@/server/services/quotes";
import { listInvoices } from "@/server/services/invoices";

export default async function DashboardPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);

  if (!context) {
    return (
      <Panel>
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p className="mt-2 text-sm text-ink/70">
          You are signed in, but you do not belong to an organization yet. Create one to start using Pestimator.
        </p>
        <form action="/app/settings" className="mt-6">
          <Link href="/app/settings" className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">
            Open setup
          </Link>
        </form>
      </Panel>
    );
  }

  const [customers, quotes, invoices] = await Promise.all([
    listCustomers(context.organization.id),
    listQuotes(context.organization.id),
    listInvoices(context.organization.id)
  ]);

  const issuedInvoices = invoices.filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PARTIAL");
  const acceptedQuotes = quotes.filter((quote) => quote.status === "ACCEPTED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{context.organization.name}</h1>
          <p className="mt-2 text-sm text-ink/65">Owner view of pipeline, receivables, and customer activity.</p>
        </div>
        <Link href="/app/quotes/new" className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">
          New quote
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Customers", value: customers.length },
          { label: "Open quotes", value: quotes.filter((quote) => quote.status === "DRAFT" || quote.status === "SENT").length },
          { label: "Accepted quotes", value: acceptedQuotes.length },
          { label: "Outstanding", value: currency(issuedInvoices.reduce((sum, invoice) => sum + invoice.outstandingTotal, 0)) }
        ].map((card) => (
          <Panel key={card.label}>
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink/45">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold text-ink">{card.value}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent quotes</h2>
            <Link href="/app/quotes" className="text-sm text-pine underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {quotes.slice(0, 6).map((quote) => (
              <Link key={quote.id} href={`/app/quotes/${quote.id}`} className="block rounded-2xl border border-ink/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{quote.quoteNumber}</div>
                    <div className="text-sm text-ink/65">{quote.customerNameSnapshot}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{currency(quote.grandTotal)}</div>
                    <div className="text-sm text-ink/55">{quote.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Receivables</h2>
            <Link href="/app/invoices" className="text-sm text-pine underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {invoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="block rounded-2xl border border-ink/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-ink/65">{invoice.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{currency(invoice.grandTotal)}</div>
                    <div className="text-sm text-ink/55">{currency(invoice.outstandingTotal)} outstanding</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
