import Card from "@/components/Card";
import PrintButton from "@/components/PrintButton";
import Link from "next/link";
import type { Invoice, LineItem } from "@/lib/types";

async function getInvoice(id: string): Promise<Invoice | null> {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/invoices/${id}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json() as Promise<Invoice>;
}

export default async function InvoiceDetail({ params }: { params: { id: string }}) {
  const invoice = await getInvoice(params.id);
  if (!invoice) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <Card>Invoice not found.</Card>
      </main>
    );
  }

  const customerLabel = invoice.customerName || invoice.customerId;
  const created = new Date(invoice.createdAt).toLocaleDateString();

  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-4">
      <Card className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Invoice {invoice.number}</h1>
          <div className="text-slate-600">{customerLabel}</div>
          <div className="text-slate-500 text-sm">Created {created}</div>
          {invoice.quoteId && (
            <Link className="text-slate-700 underline" href={`/quotes/${invoice.quoteId}`}>
              View related quote
            </Link>
          )}
        </div>
        <PrintButton>Print invoice</PrintButton>
      </Card>
      <Card>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Qty</th>
              <th className="text-left">Unit</th>
              <th className="text-right">Line</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it: LineItem, i: number) => (
              <tr key={i}>
                <td>{it.qty}</td>
                <td>${it.unitPrice.toFixed(2)}</td>
                <td className="text-right">${it.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="flex justify-end gap-6">
        <div>
          Subtotal <b>${invoice.subtotal.toFixed(2)}</b>
        </div>
        <div>
          Tax <b>${invoice.tax.toFixed(2)}</b>
        </div>
        <div>
          Total <b>${invoice.total.toFixed(2)}</b>
        </div>
      </Card>
    </main>
  );
}
