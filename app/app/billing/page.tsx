import { Panel } from "@/components/ui/panel";
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
    <Panel>
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Billing</p>
      <h1 className="mt-2 text-3xl font-semibold">Subscription status</h1>
      {subscription ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-canvas p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Plan</div>
            <div className="mt-2 text-xl font-semibold capitalize">{subscription.plan}</div>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Status</div>
            <div className="mt-2 text-xl font-semibold">{subscription.status}</div>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Current period end</div>
            <div className="mt-2 text-xl font-semibold">{dateOnly(subscription.currentPeriodEnd)}</div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink/65">No subscription record exists yet for this organization.</p>
      )}
    </Panel>
  );
}
