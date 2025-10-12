import { Card } from '@/components/ui/Card';
import { LineItemTable } from '@/components/pricing/LineItemTable';
import { Button } from '@/components/ui/Button';
import type { PricingLineItem } from '@/lib/pricing/engine';

const sampleQuote: {
  id: string;
  customer: string;
  property: string;
  total: number;
  status: string;
  lineItems: PricingLineItem[];
} = {
  id: 'Q-2024-0004',
  customer: 'Jordan Residence',
  property: 'Jordan Residence',
  total: 385,
  status: 'Accepted',
  lineItems: [
    { kind: 'materials', label: 'Bifenthrin 7.9%', amount: 46.2, qty: 1.8, unit: 'units', unitCost: 25.67 },
    { kind: 'labor', label: 'Labor', amount: 180, qty: 3.4, unit: 'hours', unitCost: 52.94 },
    { kind: 'travel', label: 'Travel', amount: 30, qty: 45, unit: 'minutes', unitCost: 0.67 },
    { kind: 'tax', label: 'Tax', amount: 28.6 },
  ],
};

export default function QuoteDetailPage() {
  return (
    <div className="space-y-6">
      <Card title={<span className="text-lg font-semibold">Quote {sampleQuote.id}</span>}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Customer</dt>
            <dd className="text-sm text-slate-800">{sampleQuote.customer}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Property</dt>
            <dd className="text-sm text-slate-800">{sampleQuote.property}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
            <dd className="text-sm text-slate-800">{sampleQuote.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
            <dd className="text-sm text-slate-800">${sampleQuote.total.toFixed(2)}</dd>
          </div>
        </dl>
      </Card>
      <Card title={<span className="text-lg font-semibold">Breakdown</span>}>
        <LineItemTable items={sampleQuote.lineItems} />
        <div className="mt-4 flex gap-2">
          <Button type="button">Generate PDF</Button>
          <Button type="button" variant="secondary">
            Duplicate quote
          </Button>
        </div>
      </Card>
    </div>
  );
}
