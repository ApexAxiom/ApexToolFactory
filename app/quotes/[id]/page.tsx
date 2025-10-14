import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { requireOrgId } from '@/lib/auth/org';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  await requireUser();
  const orgId = await requireOrgId();
  const quote = await prisma.quote.findFirst({
    where: { id: params.id, orgId },
    include: {
      customer: true,
      property: true,
      serviceTemplate: true,
      items: { orderBy: { amount: 'desc' } },
    },
  });

  if (!quote) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quote {quote.quoteNumber}</h1>
          <p className="text-sm text-slate-600">
            {quote.customer.name} — {quote.property.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Total</p>
          <p className="text-xl font-semibold">{currencyFormatter.format(quote.total)}</p>
        </div>
      </header>

      <section className="mt-8 grid gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-slate-600">Service template</h2>
          <p className="text-base">{quote.serviceTemplate.name}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-600">Scope</h2>
          <p className="text-base">
            {quote.interior ? 'Interior' : ''} {quote.exterior ? 'Exterior' : ''}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-600">Area</h2>
          <p className="text-base">{quote.area.toLocaleString()} sq ft</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-600">Pricing mode</h2>
          <p className="text-base">
            {quote.pricingMode === 'margin' ? 'Margin' : 'Markup'} ({(quote.marginOrMarkup * 100).toFixed(1)}%)
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Line items</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Description</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Qty</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id} className="odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-2 capitalize text-slate-700">{item.kind}</td>
                  <td className="px-4 py-2 text-slate-800">{item.label}</td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {item.quantity ? `${item.quantity.toFixed(2)} ${item.unit ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-800">{currencyFormatter.format(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:w-1/2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{currencyFormatter.format(quote.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Tax</span>
          <span>{currencyFormatter.format(quote.tax)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{currencyFormatter.format(quote.total)}</span>
        </div>
      </section>

      <section className="mt-10">
        <a
          href={`/quotes/${quote.id}/pdf`}
          className="inline-flex items-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Download PDF (coming soon)
        </a>
      </section>
    </main>
  );
}
