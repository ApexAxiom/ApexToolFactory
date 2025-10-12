import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

const services = [
  { name: 'General Pest (Interior/Exterior)', unit: 'ft²', minPrice: 95, residential: '1.0x', commercial: '1.15x' },
  { name: 'Termite Perimeter', unit: 'linear ft', minPrice: 175, residential: '1.0x', commercial: '1.2x' },
];

export default function ServicesPage() {
  return (
    <Card title={<span className="text-lg font-semibold">Service Templates</span>}>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Unit</TH>
            <TH className="text-right">Minimum</TH>
            <TH className="text-right">Residential</TH>
            <TH className="text-right">Commercial</TH>
          </TR>
        </THead>
        <TBody>
          {services.map((service) => (
            <TR key={service.name}>
              <TD>{service.name}</TD>
              <TD>{service.unit}</TD>
              <TD className="text-right">${service.minPrice.toFixed(2)}</TD>
              <TD className="text-right">{service.residential}</TD>
              <TD className="text-right">{service.commercial}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
