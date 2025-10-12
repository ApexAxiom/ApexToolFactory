import { Card } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

const members = [
  { name: 'Jordan Carter', role: 'Owner', email: 'admin@example.com' },
  { name: 'Alex Morgan', role: 'Estimator', email: 'alex@example.com' },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <Card title={<span className="text-lg font-semibold">Team members</span>}>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Role</TH>
              <TH>Email</TH>
            </TR>
          </THead>
          <TBody>
            {members.map((member) => (
              <TR key={member.email}>
                <TD>{member.name}</TD>
                <TD>{member.role}</TD>
                <TD>{member.email}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card title={<span className="text-lg font-semibold">Invitations</span>}>
        <p className="text-sm text-slate-600">Send invites to teammates with role-based access.</p>
        <Button type="button">Invite teammate</Button>
      </Card>
    </div>
  );
}
