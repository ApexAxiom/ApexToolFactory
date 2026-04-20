import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { createOrganizationAction } from "@/server/actions/app";

export default async function SettingsPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);

  if (!context) {
    return (
      <Panel>
        <h1 className="text-3xl font-semibold">Create your first organization</h1>
        <p className="mt-2 text-sm text-ink/65">This sets up the first tenant, branch, membership, and trial subscription.</p>
        <form action={createOrganizationAction} className="mt-6 grid gap-4 md:max-w-xl">
          <label className="space-y-2 text-sm font-medium">
            Organization name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="name" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Legal name
            <input className="w-full rounded-2xl border border-ink/10 bg-canvas px-4 py-3" name="legalName" />
          </label>
          <button className="w-fit rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white">Create organization</button>
        </form>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">{context.organization.name}</h1>
        <p className="mt-2 text-sm text-ink/65">
          Currency: {context.organization.currencyCode} • Timezone: {context.organization.timezone} • Tax default: {context.organization.defaultTaxPercent}%
        </p>
      </Panel>
      <Panel>
        <h2 className="text-xl font-semibold">Production checklist</h2>
        <ul className="mt-4 space-y-3 text-sm text-ink/75">
          <li>Configure Cognito app client and TOTP MFA for internal users.</li>
          <li>Verify the SES sending domain and move SES out of sandbox.</li>
          <li>Set S3 bucket and Stripe secrets in the deployment environment.</li>
          <li>Map Amplify-created Dynamo table names into the app environment.</li>
        </ul>
      </Panel>
    </div>
  );
}
