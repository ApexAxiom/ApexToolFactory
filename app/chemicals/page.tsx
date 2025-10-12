import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

const chemicals = [
  { name: 'Bifenthrin 7.9%', packageSize: '1 gallon', cost: 85, waste: '5%' },
  { name: 'Deltamethrin WP', packageSize: '1 lb', cost: 62, waste: '5%' },
];

export default function ChemicalsPage() {
  return (
    <Card title={<span className="text-lg font-semibold">Chemical Catalog</span>}>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Package</TH>
            <TH className="text-right">Cost</TH>
            <TH className="text-right">Waste</TH>
          </TR>
        </THead>
        <TBody>
          {chemicals.map((chemical) => (
            <TR key={chemical.name}>
              <TD>{chemical.name}</TD>
              <TD>{chemical.packageSize}</TD>
              <TD className="text-right">${chemical.cost.toFixed(2)}</TD>
              <TD className="text-right">{chemical.waste}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
