import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';

const customers = [
  { id: 'cust1', name: 'Jordan Residence', type: 'Residential', email: 'jordan@example.com' },
  { id: 'cust2', name: 'Woodland Apartments', type: 'Commercial', email: 'manager@woodland.com' },
];

export default function CustomersPage() {
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Customers</span>
          <Link href="/customers/new" className="gradient-button text-sm">
            New customer
          </Link>
        </div>
      }
    >
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH>Email</TH>
          </TR>
        </THead>
        <TBody>
          {customers.map((customer) => (
            <TR key={customer.id}>
              <TD>
                <Link href={`/customers/${customer.id}`} className="text-brand-accent">
                  {customer.name}
                </Link>
              </TD>
              <TD>{customer.type}</TD>
              <TD>{customer.email}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
