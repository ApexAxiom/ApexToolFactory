import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listCustomers } from "@/server/services/customers";
import { createCustomerAction } from "@/server/actions/app";
import Link from "next/link";

export default async function CustomersPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const customers = await listCustomers(context.organization.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel>
        <div className="mb-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Customers</p>
          <h1 className="mt-2 text-3xl font-semibold">Accounts and billing contacts</h1>
        </div>
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/app/customers/${customer.id}`} className="block rounded-2xl border border-ink/10 px-4 py-4">
              <div className="font-medium">{customer.name}</div>
              <div className="mt-1 text-sm text-ink/65">
                {[customer.email, customer.phone, customer.billingCity].filter(Boolean).join(" • ") || "No contact info yet"}
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-xl font-semibold">Create customer</h2>
        <form action={createCustomerAction} className="mt-5 grid gap-4">
          <label className="space-y-2 text-sm font-medium">
            Company or customer name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="name" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Primary contact name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="primaryContactName" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Email
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="email" type="email" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Phone
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="phone" />
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium">
            Billing address
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="billingAddress1" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">
              City
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="billingCity" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              State
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="billingState" />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Postal code
              <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="billingPostalCode" />
            </label>
          </div>
          <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Save customer</button>
        </form>
      </Panel>
    </div>
  );
}
