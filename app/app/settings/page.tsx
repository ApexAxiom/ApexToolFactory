import { CheckCircle2, Cloud, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { createOrganizationAction } from "@/server/actions/app";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function SettingsPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);

  if (!context) {
    return (
      <Panel>
        <PageHeader
          title="Create your first organization"
          description="This creates the first tenant, branch, owner membership, and trial subscription."
        />
        <form action={createOrganizationAction} className="mt-6 grid gap-4 md:max-w-xl">
          <label className="space-y-2 text-sm font-semibold">
            Organization name
            <input className={`${inputClass} w-full`} name="name" required />
          </label>
          <label className="space-y-2 text-sm font-semibold">
            Legal name
            <input className={`${inputClass} w-full`} name="legalName" />
          </label>
          <Button className="w-fit">Create organization</Button>
        </form>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title={context.organization.name}
        description={`Currency: ${context.organization.currencyCode} / Timezone: ${context.organization.timezone} / Tax default: ${context.organization.defaultTaxPercent}%`}
      />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald" />
            <h2 className="text-lg font-semibold">Workspace security</h2>
          </div>
          <div className="space-y-3 text-sm text-muted">
            {["Cognito email sign-in", "TOTP MFA required", "HttpOnly session cookie", "Server-side tenant checks"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Cloud className="h-6 w-6 text-emerald" />
            <h2 className="text-lg font-semibold">Production checklist</h2>
          </div>
          <ul className="space-y-3 text-sm text-muted">
            {[
              "Configure Cognito app client and required TOTP MFA.",
              "Verify the SES sending domain and move SES out of sandbox.",
              "Set S3 bucket and Stripe secrets in the deployment environment.",
              "Deploy the Amplify Gen 2 backend and expose table names to the SSR app.",
              "Confirm Stripe and SES webhook URLs use the production APP_URL domain."
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
