import Link from "next/link";
import { Building2, Mail, Phone, Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listCustomers } from "@/server/services/customers";
import { createCustomerAction } from "@/server/actions/app";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function CustomersPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const customers = await listCustomers(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Accounts and billing contacts"
        description="Keep commercial clients, primary contacts, billing details, and service properties in one place."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Client list</h2>
            <span className="text-sm font-semibold text-muted">{customers.length} records</span>
          </div>
          <div className="space-y-3">
            {customers.map((customer) => (
              <Link key={customer.id} href={`/app/customers/${customer.id}`} className="block rounded-lg border border-line p-4 hover:bg-canvas">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{customer.name}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      {customer.email ? <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" /> {customer.email}</span> : null}
                      {customer.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {customer.phone}</span> : null}
                      {customer.billingCity ? <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" /> {customer.billingCity}</span> : null}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald">Open</span>
                </div>
              </Link>
            ))}
            {customers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
                No clients yet. Create one to unlock quote building.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Create client</h2>
          <p className="mt-1 text-sm text-muted">Add the billing account and primary contact before quoting work.</p>
          <form action={createCustomerAction} className="mt-5 grid gap-4">
            <label className="space-y-2 text-sm font-semibold">
              Company or customer name
              <input className={`${inputClass} w-full`} name="name" required />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Primary contact name
              <input className={`${inputClass} w-full`} name="primaryContactName" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold">
                Email
                <input className={`${inputClass} w-full`} name="email" type="email" />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Phone
                <input className={`${inputClass} w-full`} name="phone" />
              </label>
            </div>
            <label className="space-y-2 text-sm font-semibold">
              Billing address
              <input className={`${inputClass} w-full`} name="billingAddress1" />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm font-semibold">
                City
                <input className={`${inputClass} w-full`} name="billingCity" />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                State
                <input className={`${inputClass} w-full`} name="billingState" />
              </label>
              <label className="space-y-2 text-sm font-semibold">
                Postal code
                <input className={`${inputClass} w-full`} name="billingPostalCode" />
              </label>
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Save client
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
