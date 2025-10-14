import Link from 'next/link';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { requireOrgId } from '@/lib/auth/org';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default async function QuotesIndexPage() {
  await requireUser();
  const orgId = await requireOrgId();
  const quotes = await prisma.quote.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      customer: true,
      property: true,
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-sm text-slate-600">Review your most recent quotes and create new ones.</p>
        </div>
        <Link
          href="/quotes/new"
          className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          New quote
        </Link>
      </div>

      <section className="mt-6 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Quote #</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Customer</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Property</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Created</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="odd:bg-white even:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/quotes/${quote.id}`} className="text-sky-700 hover:underline">
                    {quote.quoteNumber}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-800">{quote.customer.name}</td>
                <td className="px-4 py-2 text-slate-600">{quote.property.name}</td>
                <td className="px-4 py-2 text-right text-slate-800">{currencyFormatter.format(quote.total)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{quote.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {quotes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No quotes yet. Create your first quote to see it here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
