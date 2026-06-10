import { Building2, CheckCircle2, Cloud, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { hasPermission } from "@/server/auth/permissions";
import { createOrganizationAction, updateOrganizationAction } from "@/server/actions/app";

const inputClass = "h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

const timezones = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu"
];

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
          <SubmitButton className="w-fit" pendingText="Creating...">
            Create organization
          </SubmitButton>
        </form>
      </Panel>
    );
  }

  const organization = context.organization;
  const canManage = hasPermission(context.membership, "settings:manage");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title={organization.name}
        description="Company details flow into quotes, invoices, and customer emails."
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="h-6 w-6 text-emerald" />
            <div>
              <h2 className="text-lg font-semibold">Company profile</h2>
              <p className="text-sm text-muted">
                {canManage ? "Changes apply to new quotes and invoices." : "Ask an owner or office manager to make changes."}
              </p>
            </div>
          </div>
          <form action={updateOrganizationAction} className="grid gap-4">
            <fieldset disabled={!canManage} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Company name
                  <input className={`${inputClass} w-full`} name="name" defaultValue={organization.name} required />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Legal name
                  <input className={`${inputClass} w-full`} name="legalName" defaultValue={organization.legalName ?? ""} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-2 text-sm font-semibold">
                  Timezone
                  <select className={`${inputClass} w-full`} name="timezone" defaultValue={organization.timezone}>
                    {[organization.timezone, ...timezones]
                      .filter((zone, index, all) => all.indexOf(zone) === index)
                      .map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Currency
                  <input className={`${inputClass} w-full`} name="currencyCode" defaultValue={organization.currencyCode} required />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Default tax %
                  <input
                    className={`${inputClass} w-full`}
                    name="defaultTaxPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={organization.defaultTaxPercent}
                    required
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Payment terms
                  <input className={`${inputClass} w-full`} name="defaultTerms" defaultValue={organization.defaultTerms} required />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Website
                  <input className={`${inputClass} w-full`} name="website" defaultValue={organization.website ?? ""} />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold">
                  Support email
                  <input className={`${inputClass} w-full`} name="supportEmail" type="email" defaultValue={organization.supportEmail ?? ""} />
                </label>
                <label className="space-y-2 text-sm font-semibold">
                  Support phone
                  <input className={`${inputClass} w-full`} name="supportPhone" defaultValue={organization.supportPhone ?? ""} />
                </label>
              </div>
              {canManage ? (
                <SubmitButton className="w-fit" pendingText="Saving...">
                  Save settings
                </SubmitButton>
              ) : null}
            </fieldset>
          </form>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald" />
              <h2 className="text-lg font-semibold">Workspace security</h2>
            </div>
            <div className="space-y-3 text-sm text-muted">
              {[
                "Cognito email sign-in with TOTP MFA",
                "HttpOnly session cookie + route middleware",
                "Role-based permissions per teammate",
                "Server-side tenant checks on every query"
              ].map((item) => (
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
    </div>
  );
}
