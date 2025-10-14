import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type CustomerDetailProps = {
  params: { id: string };
};

const customerStore: Record<string, { name: string; type: string; email: string; phone: string }> = {
  cust1: { name: 'Jordan Residence', type: 'Residential', email: 'jordan@example.com', phone: '512-555-0167' },
  cust2: {
    name: 'Woodland Apartments',
    type: 'Commercial',
    email: 'manager@woodland.com',
    phone: '512-555-0420',
  },
};

export default function CustomerDetailPage({ params }: CustomerDetailProps) {
  const customer = customerStore[params.id];
  if (!customer) {
    return (
      <Card title={<span className="text-lg font-semibold">Customer not found</span>}>
        <p className="text-sm text-slate-600">This record may have been deleted or you lack permissions.</p>
        <Link href="/customers" className="gradient-button text-sm">
          Back to customers
        </Link>
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      <Card title={<span className="text-lg font-semibold">{customer.name}</span>}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
            <dd className="text-sm text-slate-800">{customer.type}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="text-sm text-slate-800">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
            <dd className="text-sm text-slate-800">{customer.phone}</dd>
          </div>
        </dl>
      </Card>
      <Card title={<span className="text-lg font-semibold">Properties</span>}>
        <p className="text-sm text-slate-600">
          Properties scoped to this customer will appear here once created.
        </p>
        <Button type="button" variant="secondary">
          Add property
        </Button>
      </Card>
    </div>
  );
}
