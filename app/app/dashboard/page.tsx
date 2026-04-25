import Link from "next/link";
import { ArrowUpRight, Clock3, DollarSign, FileText, Plus, Users } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { currency, dateOnly } from "@/lib/utils";
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
        <PageHeader
          title="Create your organization"
          description="You are signed in, but you do not belong to an organization yet. Create one to start using Pestimator."
        />
        <Link href="/app/settings" className="mt-6 inline-flex h-10 items-center rounded-md bg-emerald px-4 text-sm font-semibold text-white">
          Open setup
        </Link>
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
  const openQuotes = quotes.filter((quote) => quote.status === "DRAFT" || quote.status === "SENT" || quote.status === "VIEWED");
  const revenue = invoices.reduce((sum, invoice) => sum + invoice.paidTotal, 0);
  const outstanding = issuedInvoices.reduce((sum, invoice) => sum + invoice.outstandingTotal, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Run your business"
        title={context.organization.name}
        description="Owner view of quote velocity, receivables, and customer activity."
        actions={
          <Link href="/app/quotes/new">
            <Button>
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Quotes sent", value: quotes.length, delta: "+18% vs last month", icon: FileText },
          { label: "Win rate", value: quotes.length ? `${Math.round((acceptedQuotes.length / quotes.length) * 100)}%` : "0%", delta: "+8% vs last month", icon: ArrowUpRight },
          { label: "Revenue", value: currency(revenue), delta: "+22% vs last month", icon: DollarSign },
          { label: "Avg. time to create", value: "6 min", delta: "+14% vs last month", icon: Clock3 }
        ].map((card) => (
          <Panel key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-muted">{card.label}</div>
                <div className="mt-3 text-3xl font-semibold text-ink">{card.value}</div>
                <div className="mt-3 text-xs font-semibold text-emerald">{card.delta}</div>
              </div>
              <card.icon className="h-6 w-6 text-emerald" strokeWidth={1.8} />
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent quotes</h2>
              <p className="text-sm text-muted">{openQuotes.length} open proposals need attention</p>
            </div>
            <Link href="/app/quotes" className="text-sm font-semibold text-emerald">View all</Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Quote</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quotes.slice(0, 6).map((quote) => (
                  <tr key={quote.id} className="hover:bg-canvas/70">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/app/quotes/${quote.id}`}>{quote.quoteNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{quote.customerNameSnapshot}</td>
                    <td className="px-4 py-3 text-muted">{dateOnly(quote.createdAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{currency(quote.grandTotal)}</td>
                    <td className="px-4 py-3 text-right"><StatusPill status={quote.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Receivables</h2>
              <p className="text-sm text-muted">{currency(outstanding)} currently outstanding</p>
            </div>
            <Link href="/app/invoices" className="text-sm font-semibold text-emerald">View all</Link>
          </div>
          <div className="space-y-3">
            {invoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="block rounded-lg border border-line p-4 hover:bg-canvas">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{invoice.invoiceNumber}</div>
                    <div className="mt-1 text-sm text-muted">Due {dateOnly(invoice.dueDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{currency(invoice.outstandingTotal)}</div>
                    <StatusPill status={invoice.status} className="mt-2" />
                  </div>
                </div>
              </Link>
            ))}
            {invoices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                No invoices yet. Accepted quotes can be converted into invoices from the quote detail page.
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Customers", value: customers.length, icon: Users },
          { label: "Open quotes", value: openQuotes.length, icon: FileText },
          { label: "Outstanding", value: currency(outstanding), icon: DollarSign }
        ].map((item) => (
          <Panel key={item.label} className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{item.label}</div>
              <div className="mt-1 text-2xl font-semibold">{item.value}</div>
            </div>
            <item.icon className="h-7 w-7 text-emerald" />
          </Panel>
        ))}
      </div>
    </div>
  );
}
