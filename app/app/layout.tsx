import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getSubscription } from "@/server/services/billing";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  const subscription = context ? await getSubscription(context.organization.id) : null;

  return (
    <AppShell organization={context?.organization || null} subscription={subscription} userEmail={session.email}>
      {children}
    </AppShell>
  );
}
