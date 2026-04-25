import { CreditCard, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getSubscription } from "@/server/services/billing";

export default async function BillingPage() {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const subscription = await getSubscription(context.organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Subscription status"
        description="Monitor your trial, plan, Stripe subscription state, and payment readiness."
      />
      {subscription ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Plan", subscription.plan],
            ["Status", <StatusPill key="status" status={subscription.status} />],
            ["Current period end", dateOnly(subscription.currentPeriodEnd)]
          ].map(([label, value]) => (
            <Panel key={label as string}>
              <div className="text-sm font-semibold text-muted">{label}</div>
              <div className="mt-3 text-2xl font-semibold capitalize">{value}</div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <p className="text-sm text-muted">No subscription record exists yet for this organization.</p>
        </Panel>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-emerald" />
            <h2 className="text-lg font-semibold">Stripe readiness</h2>
          </div>
          <p className="text-sm leading-6 text-muted">
            Invoice payment links are created through Stripe when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are configured in production.
          </p>
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald" />
            <h2 className="text-lg font-semibold">Trial terms</h2>
          </div>
          <p className="text-sm leading-6 text-muted">
            New self-serve organizations start on the starter trial and can be upgraded once subscription checkout is enabled.
          </p>
        </Panel>
      </div>
    </div>
  );
}
