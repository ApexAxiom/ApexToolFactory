import type { PricingLineItem } from '@/lib/pricing/engine';
import { Badge } from '@/components/ui/Badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

export interface LineItemTableProps {
  items: PricingLineItem[];
}

const labelMap: Record<PricingLineItem['kind'], string> = {
  materials: 'Materials',
  labor: 'Labor',
  travel: 'Travel',
  fee: 'Fee',
  discount: 'Discount',
  other: 'Other',
  tax: 'Tax',
};

export function LineItemTable({ items }: LineItemTableProps) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Type</TH>
          <TH>Label</TH>
          <TH className="text-right">Quantity</TH>
          <TH className="text-right">Unit</TH>
          <TH className="text-right">Unit Cost</TH>
          <TH className="text-right">Amount</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={`${item.kind}-${item.label}`}>
            <TD>
              <Badge tone={item.kind === 'discount' ? 'warning' : 'info'}>{labelMap[item.kind]}</Badge>
            </TD>
            <TD>{item.label}</TD>
            <TD className="text-right">{item.qty?.toFixed(2) ?? '—'}</TD>
            <TD className="text-right">{item.unit ?? '—'}</TD>
            <TD className="text-right">{item.unitCost ? `$${item.unitCost.toFixed(2)}` : '—'}</TD>
            <TD className="text-right font-semibold">${item.amount.toFixed(2)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
