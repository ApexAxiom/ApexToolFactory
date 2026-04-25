import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { currency } from "@/lib/utils";
import { createPropertyAction } from "@/server/actions/app";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import {
  getCustomer,
  getCustomerContacts,
  getCustomerFinancialSummary,
  getCustomerProperties
} from "@/server/services/customers";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer || customer.organizationId !== context.organization.id) notFound();

  const [contacts, properties, summary] = await Promise.all([
    getCustomerContacts(customer.id, context.organization.id),
    getCustomerProperties(customer.id, context.organization.id),
    getCustomerFinancialSummary(customer.id, context.organization.id)
  ]);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Client record</p>
            <h1 className="mt-2 text-3xl font-semibold">{customer.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {[customer.email, customer.phone, customer.billingAddress1].filter(Boolean).join(" / ") || "No billing profile yet"}
            </p>
          </div>
          <Link href="/app/quotes/new">
            <Button>
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel>
          <h2 className="text-lg font-semibold">Account history</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Quoted", currency(summary.quotedTotal)],
              ["Invoiced", currency(summary.invoicedTotal)],
              ["Outstanding", currency(summary.outstandingTotal)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-canvas p-4">
                <div className="text-xs font-semibold uppercase text-muted">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Quote</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.quotes.slice(0, 6).map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/app/quotes/${quote.id}`}>{quote.quoteNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{currency(quote.grandTotal)}</td>
                    <td className="px-4 py-3 text-right"><StatusPill status={quote.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Properties and contacts</h2>
          <div className="mt-4 space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-lg border border-line p-4">
                <div className="font-semibold">{contact.name}</div>
                <div className="mt-1 text-sm text-muted">{[contact.email, contact.phone].filter(Boolean).join(" / ")}</div>
              </div>
            ))}
            {properties.map((property) => (
              <Link key={property.id} href={`/app/properties/${property.id}`} className="block rounded-lg border border-line p-4 hover:bg-canvas">
                <div className="font-semibold">{property.name}</div>
                <div className="mt-1 text-sm text-muted">{[property.address1, property.city, property.state].filter(Boolean).join(", ")}</div>
              </Link>
            ))}
          </div>
          <form action={createPropertyAction} className="mt-6 grid gap-3 border-t border-line pt-6">
            <input type="hidden" name="customerId" value={customer.id} />
            <label className="space-y-2 text-sm font-semibold">
              Property name
              <input className={`${inputClass} w-full`} name="name" required />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Service address
              <input className={`${inputClass} w-full`} name="address1" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <input className={inputClass} name="city" placeholder="City" />
              <input className={inputClass} name="state" placeholder="State" />
              <input className={inputClass} name="postalCode" placeholder="Postal code" />
              <input className={inputClass} name="sqft" placeholder="Sqft" type="number" />
            </div>
            <Button>Add property</Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
