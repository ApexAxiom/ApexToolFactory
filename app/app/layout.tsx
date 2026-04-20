import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);

  return (
    <AppShell organization={context?.organization || null} userEmail={session.email}>
      {children}
    </AppShell>
  );
}
