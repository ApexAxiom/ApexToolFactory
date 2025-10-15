import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

const properties = [
  { id: 'prop1', name: 'Jordan Residence', type: 'Residential', area: 2200 },
  { id: 'prop2', name: 'Woodland Apartments', type: 'Commercial', area: 52000 },
];

export default function PropertiesPage() {
  return (
    <Card title={<span className="text-lg font-semibold">Properties</span>}>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH className="text-right">Area (ft²)</TH>
          </TR>
        </THead>
        <TBody>
          {properties.map((property) => (
            <TR key={property.id}>
              <TD>
                <Link href={`/properties/${property.id}`} className="text-brand-accent">
                  {property.name}
                </Link>
              </TD>
              <TD>{property.type}</TD>
              <TD className="text-right">{property.area.toLocaleString()}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
