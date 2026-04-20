import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { inviteTeamMemberAction } from "@/server/actions/app";
import { listTeamMembers } from "@/server/services/team";

export default async function TeamPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const team = await listTeamMembers(context.organization.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Team</p>
        <h1 className="mt-2 text-3xl font-semibold">Roles and invitations</h1>
        <div className="mt-5 space-y-3">
          {team.map((member) => (
            <div key={member.id} className="rounded-2xl border border-ink/10 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{member.displayName || member.email}</div>
                  <div className="text-sm text-ink/65">{member.email}</div>
                </div>
                <div className="text-right text-sm text-ink/65">
                  <div>{member.role}</div>
                  <div>{member.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-xl font-semibold">Invite teammate</h2>
        <form action={inviteTeamMemberAction} className="mt-5 grid gap-4">
          <label className="space-y-2 text-sm font-medium">
            Display name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="displayName" />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Email
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="email" type="email" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Role
            <select className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="role">
              <option value="OWNER">Owner</option>
              <option value="OFFICE_MANAGER">Office Manager</option>
              <option value="ESTIMATOR">Estimator</option>
              <option value="TECHNICIAN">Technician</option>
              <option value="ACCOUNTING">Accounting</option>
            </select>
          </label>
          <button className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Send invite</button>
        </form>
      </Panel>
    </div>
  );
}
