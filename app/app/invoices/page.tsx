import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listInvoices } from "@/server/services/invoices";

export default async function InvoicesPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const invoices = await listInvoices(context.organization.id);

  return (
    <Panel>
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Invoices</p>
        <h1 className="mt-2 text-3xl font-semibold">Receivables</h1>
      </div>
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Link key={invoice.id} href={`/app/invoices/${invoice.id}`} className="block rounded-2xl border border-ink/10 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.7fr_0.5fr]">
              <div className="font-medium">{invoice.invoiceNumber}</div>
              <div className="text-sm text-ink/65">{dateOnly(invoice.issueDate)}</div>
              <div className="text-sm">{currency(invoice.grandTotal)}</div>
              <div className="text-right text-sm text-ink/65">{invoice.status}</div>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
