import { Plus } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { hasPermission } from "@/server/auth/permissions";
import { inviteTeamMemberAction, updateTeamMemberAction } from "@/server/actions/app";
import { listTeamMembers } from "@/server/services/team";

const roleOptions = [
  ["OWNER", "Owner"],
  ["OFFICE_MANAGER", "Office Manager"],
  ["ESTIMATOR", "Estimator"],
  ["TECHNICIAN", "Technician"],
  ["ACCOUNTING", "Accounting"]
] as const;

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function TeamPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const team = await listTeamMembers(context.organization.id);
  const canManage = hasPermission(context.membership, "team:manage");

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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{member.displayName || member.email}</div>
                    <div className="text-sm text-muted">{member.email}</div>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={updateTeamMemberAction} className="flex items-center gap-2">
                        <input type="hidden" name="membershipId" value={member.id} />
                        <select
                          className={`${inputClass} w-44`}
                          name="role"
                          defaultValue={member.role}
                          aria-label={`Role for ${member.email}`}
                        >
                          {roleOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <SubmitButton variant="secondary" pendingText="...">
                          Update
                        </SubmitButton>
                      </form>
                      {member.status !== "DISABLED" ? (
                        <form action={updateTeamMemberAction}>
                          <input type="hidden" name="membershipId" value={member.id} />
                          <input type="hidden" name="status" value="DISABLED" />
                          <SubmitButton variant="ghost" pendingText="...">
                            Disable
                          </SubmitButton>
                        </form>
                      ) : (
                        <form action={updateTeamMemberAction}>
                          <input type="hidden" name="membershipId" value={member.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <SubmitButton variant="secondary" pendingText="...">
                            Reactivate
                          </SubmitButton>
                        </form>
                      )}
                      <StatusPill status={member.status} />
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-sm font-semibold">{member.role.replace(/_/g, " ").toLowerCase()}</div>
                      <StatusPill status={member.status} className="mt-2" />
                    </div>
                  )}
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
            <SubmitButton pendingText="Saving...">
              <Plus className="h-4 w-4" />
              Send invite
            </SubmitButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}
