import Link from "next/link";
import { QuoteWizard } from "@/components/forms/quote-wizard";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
        <PageHeader
          eyebrow="Quote builder"
          title="Create quote"
          description="Add at least one client before you start a quote. Quotes are tied to a billing account and optional service property."
        />
        <Link href="/app/customers" className="mt-6 inline-block">
          <Button>Create client first</Button>
        </Link>
      </Panel>
    );
  }

  const propertyEntries = await Promise.all(
    customers.map(async (customer) => [customer.id, await getCustomerProperties(customer.id, context.organization.id)] as const)
  );

  return (
    <QuoteWizard
      customers={customers}
      propertiesByCustomer={Object.fromEntries(propertyEntries)}
      action={createQuoteDraftAction}
    />
  );
}
