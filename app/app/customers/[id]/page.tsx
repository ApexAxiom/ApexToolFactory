import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2, Pencil, Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { currency, dateOnly } from "@/lib/utils";
import { createCustomerPortalLinkAction, createPropertyAction, updateCustomerAction } from "@/server/actions/app";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import {
  getCustomer,
  getCustomerContacts,
  getCustomerFinancialSummary,
  getCustomerProperties
} from "@/server/services/customers";
import { listJobsForCustomer } from "@/server/services/jobs";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function CustomerDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portalToken?: string }>;
}) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const { portalToken } = await searchParams;
  const customer = await getCustomer(id);
  if (!customer || customer.organizationId !== context.organization.id) notFound();

  const [contacts, properties, summary, jobs] = await Promise.all([
    getCustomerContacts(customer.id, context.organization.id),
    getCustomerProperties(customer.id, context.organization.id),
    getCustomerFinancialSummary(customer.id, context.organization.id),
    listJobsForCustomer(context.organization.id, customer.id)
  ]);
  const openJobs = jobs.filter((job) => job.status !== "CANCELED" && job.status !== "COMPLETED");
  const completedJobs = jobs.filter((job) => job.status === "COMPLETED").slice(-3).reverse();

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

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald" />
              <h2 className="text-lg font-semibold">Service visits</h2>
            </div>
            <div className="space-y-2">
              {openJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/jobs/${job.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-canvas"
                >
                  <div>
                    <div className="font-semibold">{job.title}</div>
                    <div className="mt-1 text-sm text-muted">
                      {job.scheduledDate
                        ? `${dateOnly(job.scheduledDate)}${job.scheduledStartTime ? ` at ${job.scheduledStartTime}` : ""}`
                        : "Awaiting scheduling"}
                    </div>
                  </div>
                  <StatusPill status={job.status} />
                </Link>
              ))}
              {completedJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/jobs/${job.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-canvas"
                >
                  <div>
                    <div className="font-semibold">{job.title}</div>
                    <div className="mt-1 text-sm text-muted">Completed {dateOnly(job.completedAt)}</div>
                  </div>
                  <StatusPill status={job.status} />
                </Link>
              ))}
              {jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                  No visits yet. Accepted quotes appear here automatically, or book one from the schedule.
                </div>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="mb-6 rounded-lg border border-line bg-canvas p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald" />
              <h2 className="font-semibold">Customer portal</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              A secure link where {customer.name} can see upcoming visits, service history, open invoices, and
              request a visit — no login needed.
            </p>
            {portalToken ? (
              <div className="mt-3">
                <input
                  className="h-10 w-full rounded-md border border-emerald bg-white px-3 font-mono text-xs text-ink"
                  readOnly
                  value={`${process.env.APP_URL || "http://localhost:3000"}/portal/account/${portalToken}`}
                  aria-label="Customer portal link"
                />
                <p className="mt-2 text-xs font-semibold text-emerald">
                  Copy this link and send it to the customer — it is shown only once and stays valid for a year.
                </p>
              </div>
            ) : (
              <form action={createCustomerPortalLinkAction} className="mt-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <SubmitButton variant="secondary" pendingText="Generating...">
                  Generate portal link
                </SubmitButton>
              </form>
            )}
          </div>

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
              <input className={inputClass} name="city" placeholder="City" aria-label="City" />
              <input className={inputClass} name="state" placeholder="State" aria-label="State" />
              <input className={inputClass} name="postalCode" placeholder="Postal code" aria-label="Postal code" />
              <input className={inputClass} name="sqft" placeholder="Sqft" type="number" aria-label="Square footage" />
            </div>
            <SubmitButton pendingText="Adding...">Add property</SubmitButton>
          </form>

          <details className="mt-6 rounded-lg border border-line">
            <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold hover:bg-canvas">
              <Pencil className="h-4 w-4 text-emerald" />
              Edit client details
            </summary>
            <form action={updateCustomerAction} className="grid gap-3 border-t border-line p-4">
              <input type="hidden" name="customerId" value={customer.id} />
              <label className="space-y-2 text-sm font-semibold">
                Company or customer name
                <input className={`${inputClass} w-full`} name="name" defaultValue={customer.name} required />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Email
                  <input className={`${inputClass} w-full`} name="email" type="email" defaultValue={customer.email ?? ""} />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Phone
                  <input className={`${inputClass} w-full`} name="phone" defaultValue={customer.phone ?? ""} />
                </label>
              </div>
              <label className="space-y-2 text-sm font-semibold">
                Billing address
                <input className={`${inputClass} w-full`} name="billingAddress1" defaultValue={customer.billingAddress1 ?? ""} />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <input className={inputClass} name="billingCity" placeholder="City" defaultValue={customer.billingCity ?? ""} aria-label="Billing city" />
                <input className={inputClass} name="billingState" placeholder="State" defaultValue={customer.billingState ?? ""} aria-label="Billing state" />
                <input className={inputClass} name="billingPostalCode" placeholder="Postal code" defaultValue={customer.billingPostalCode ?? ""} aria-label="Billing postal code" />
              </div>
              <label className="space-y-2 text-sm font-semibold">
                Notes
                <textarea
                  className="min-h-16 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                  name="notes"
                  defaultValue={customer.notes ?? ""}
                />
              </label>
              <SubmitButton className="w-fit" pendingText="Saving...">
                Save changes
              </SubmitButton>
            </form>
          </details>
        </Panel>
      </div>
    </div>
  );
}
