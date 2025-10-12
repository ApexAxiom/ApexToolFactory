import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type PropertyDetailProps = {
  params: { id: string };
};

const propertyStore: Record<string, { name: string; type: 'Residential' | 'Commercial'; area: number; notes: string }> = {
  prop1: { name: 'Jordan Residence', type: 'Residential', area: 2200, notes: 'Two-story home, mild infestation.' },
  prop2: { name: 'Woodland Apartments', type: 'Commercial', area: 52000, notes: 'Exterior focus, quarterly service.' },
};

export default function PropertyDetailPage({ params }: PropertyDetailProps) {
  const property = propertyStore[params.id];
  if (!property) {
    return <Card title={<span className="text-lg font-semibold">Property not found</span>}>No record found.</Card>;
  }
  return (
    <Card title={<span className="text-lg font-semibold">{property.name}</span>}>
      <dl className="space-y-4">
        <div className="flex items-center gap-2">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
          <dd>
            <Badge tone={property.type === 'Residential' ? 'info' : 'success'}>{property.type}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Area</dt>
          <dd className="text-sm text-slate-800">{property.area.toLocaleString()} ft²</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
          <dd className="text-sm text-slate-700">{property.notes}</dd>
        </div>
      </dl>
    </Card>
  );
}
