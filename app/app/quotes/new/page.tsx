import Link from "next/link";
import { QuoteWizard } from "@/components/forms/quote-wizard";
import { Panel } from "@/components/ui/panel";
import { createQuoteDraftAction } from "@/server/actions/app";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listCustomers, getCustomerProperties } from "@/server/services/customers";

export default async function NewQuotePage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const customers = await listCustomers(context.organization.id);
  if (customers.length === 0) {
    return (
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Guided workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Create quote</h1>
        <p className="mt-2 text-sm text-ink/65">
          Add at least one customer before you start a quote. Quotes are tied to a billing account and optional service property.
        </p>
        <Link href="/app/customers" className="mt-6 inline-block rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">
          Create customer first
        </Link>
      </Panel>
    );
  }

  const propertyEntries = await Promise.all(
    customers.map(async (customer) => [customer.id, await getCustomerProperties(customer.id, context.organization.id)] as const)
  );

  return (
    <div className="space-y-6">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Guided workflow</p>
        <h1 className="mt-2 text-3xl font-semibold">Create quote</h1>
        <p className="mt-2 text-sm text-ink/65">
          Move through customer, scope, pricing, and review without packing the whole quote into one dense screen.
        </p>
      </Panel>
      <QuoteWizard
        customers={customers}
        propertiesByCustomer={Object.fromEntries(propertyEntries)}
        action={createQuoteDraftAction}
      />
    </div>
  );
}
