import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Invoices"
        title="Receivables"
        description="Track issued invoices, hosted payment links, partial payments, and overdue balances."
      />

      <Panel>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-canvas/70">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/app/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{dateOnly(invoice.issueDate)}</td>
                  <td className="px-4 py-3 text-muted">{dateOnly(invoice.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{currency(invoice.grandTotal)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{currency(invoice.outstandingTotal)}</td>
                  <td className="px-4 py-3 text-right"><StatusPill status={invoice.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoices.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
            No invoices yet. Convert an accepted quote to create the first invoice.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
