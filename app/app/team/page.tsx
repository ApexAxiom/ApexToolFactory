import { Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { inviteTeamMemberAction } from "@/server/actions/app";
import { listTeamMembers } from "@/server/services/team";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function TeamPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const team = await listTeamMembers(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Roles and invitations"
        description="Manage owner, office, estimator, technician, and accounting access for the workspace."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel>
          <div className="space-y-3">
            {team.map((member) => (
              <div key={member.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{member.displayName || member.email}</div>
                    <div className="text-sm text-muted">{member.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{member.role.replace(/_/g, " ").toLowerCase()}</div>
                    <StatusPill status={member.status} className="mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Invite teammate</h2>
          <form action={inviteTeamMemberAction} className="mt-5 grid gap-4">
            <label className="space-y-2 text-sm font-semibold">
              Display name
              <input className={`${inputClass} w-full`} name="displayName" />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Email
              <input className={`${inputClass} w-full`} name="email" type="email" required />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Role
              <select className={`${inputClass} w-full`} name="role">
                <option value="OWNER">Owner</option>
                <option value="OFFICE_MANAGER">Office Manager</option>
                <option value="ESTIMATOR">Estimator</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="ACCOUNTING">Accounting</option>
              </select>
            </label>
            <Button>
              <Plus className="h-4 w-4" />
              Send invite
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
