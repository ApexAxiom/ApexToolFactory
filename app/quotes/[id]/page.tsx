import { Card } from '@/components/ui/Card';
import { LineItemTable } from '@/components/pricing/LineItemTable';
import { Button } from '@/components/ui/Button';
import { notFound } from 'next/navigation';

async function fetchQuote(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/quotes/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load quote');
  return res.json();
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchQuote(params.id);
  if (!data) return notFound();
  const { quote, lineItems } = data;
  return (
    <div className="space-y-6">
      <Card title={<span className="text-lg font-semibold">Quote {quote.quoteNumber}</span>}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Customer</dt>
            <dd className="text-sm text-slate-800">{quote.property.customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Property</dt>
            <dd className="text-sm text-slate-800">{quote.property.address}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
            <dd className="text-sm text-slate-800">{quote.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
            <dd className="text-sm text-slate-800">${quote.total.toFixed(2)}</dd>
          </div>
        </dl>
      </Card>
      <Card title={<span className="text-lg font-semibold">Breakdown</span>}>
        <LineItemTable items={lineItems} />
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">Generate PDF</a>
          </Button>
          <Button type="button" variant="secondary">
            Duplicate quote
          </Button>
        </div>
      </Card>
    </div>
  );
}
