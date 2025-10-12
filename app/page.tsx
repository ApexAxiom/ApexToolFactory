import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

export default function DashboardPage() {
  const kpis = [
    { label: 'Active Quotes', value: 18 },
    { label: 'Won This Month', value: '$32,400' },
    { label: 'Average Margin', value: '47%' },
  ];
  const recentQuotes = [
    { id: 'Q-2024-0005', customer: 'Woodland Apartments', total: '$1,480', status: 'Sent' },
    { id: 'Q-2024-0004', customer: 'Jordan Residence', total: '$385', status: 'Accepted' },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} title={<span className="text-sm font-semibold text-slate-500">{kpi.label}</span>}>
            <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
          </Card>
        ))}
      </div>
      <Card
        title={
          <div className="flex w-full items-center justify-between">
            <span className="text-lg font-semibold">Recent Quotes</span>
            <a href="/quotes/new" className="gradient-button text-sm">
              New Quote
            </a>
          </div>
        }
      >
        <Table>
          <THead>
            <TR>
              <TH>Quote</TH>
              <TH>Customer</TH>
              <TH>Status</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {recentQuotes.map((quote) => (
              <TR key={quote.id}>
                <TD>{quote.id}</TD>
                <TD>{quote.customer}</TD>
                <TD>{quote.status}</TD>
                <TD className="text-right">{quote.total}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
