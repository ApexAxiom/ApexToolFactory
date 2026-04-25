import Link from "next/link";
import { Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { currency, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { listQuotes } from "@/server/services/quotes";

export default async function QuotesPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const quotes = await listQuotes(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quotes"
        title="Sales pipeline"
        description="Review every draft, sent proposal, and accepted job from one operational list."
        actions={
          <Link href="/app/quotes/new">
            <Button>
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
        }
      />

      <Panel>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-canvas/70">
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/app/quotes/${quote.id}`}>{quote.quoteNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{quote.customerNameSnapshot}</div>
                    <div className="text-xs text-muted">{quote.serviceAddressSnapshot}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{dateOnly(quote.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{dateOnly(quote.expiresAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{currency(quote.grandTotal)}</td>
                  <td className="px-4 py-3 text-right"><StatusPill status={quote.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotes.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line p-8 text-center">
            <h2 className="font-semibold">No quotes yet</h2>
            <p className="mt-2 text-sm text-muted">Create your first proposal once a client is in the workspace.</p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
