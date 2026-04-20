import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
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
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Customer record</p>
            <h1 className="mt-2 text-3xl font-semibold">{customer.name}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {[customer.email, customer.phone, customer.billingAddress1].filter(Boolean).join(" • ") || "No billing profile yet"}
            </p>
          </div>
          <Link href="/app/quotes/new" className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">
            New quote
          </Link>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-xl font-semibold">Account history</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Quoted</div>
              <div className="mt-2 text-2xl font-semibold">{currency(summary.quotedTotal)}</div>
            </div>
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Invoiced</div>
              <div className="mt-2 text-2xl font-semibold">{currency(summary.invoicedTotal)}</div>
            </div>
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Outstanding</div>
              <div className="mt-2 text-2xl font-semibold">{currency(summary.outstandingTotal)}</div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {summary.quotes.slice(0, 5).map((quote) => (
              <Link key={quote.id} href={`/app/quotes/${quote.id}`} className="block rounded-2xl border border-ink/10 px-4 py-3">
                <div className="flex justify-between gap-3">
                  <span>{quote.quoteNumber}</span>
                  <span className="text-ink/65">{quote.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold">Properties and contacts</h2>
          <div className="mt-4 space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-ink/10 px-4 py-3">
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm text-ink/65">{[contact.email, contact.phone].filter(Boolean).join(" • ")}</div>
              </div>
            ))}
            {properties.map((property) => (
              <Link key={property.id} href={`/app/properties/${property.id}`} className="block rounded-2xl border border-ink/10 px-4 py-3">
                <div className="font-medium">{property.name}</div>
                <div className="text-sm text-ink/65">{[property.address1, property.city, property.state].filter(Boolean).join(", ")}</div>
              </Link>
            ))}
          </div>
          <form action={createPropertyAction} className="mt-6 grid gap-3 border-t border-ink/10 pt-6">
            <input type="hidden" name="customerId" value={customer.id} />
            <label className="space-y-2 text-sm font-medium">
              Property name
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="name" required />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Service address
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="address1" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <input className="rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="city" placeholder="City" />
              <input className="rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="state" placeholder="State" />
              <input className="rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="postalCode" placeholder="Postal code" />
              <input className="rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="sqft" placeholder="Sqft" type="number" />
            </div>
            <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Add property</button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
