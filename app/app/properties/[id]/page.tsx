import { notFound } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getStore } from "@/server/persistence/store";
import { Property, Customer } from "@/domain/types";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const property = await getStore().get<Property>("properties", id);
  if (!property || property.organizationId !== context.organization.id) notFound();

  const customer = await getStore().get<Customer>("customers", property.customerId);

  return (
    <div className="space-y-6">
      <Panel>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-ink/45">Property</p>
        <h1 className="mt-2 text-3xl font-semibold">{property.name}</h1>
        <p className="mt-2 text-sm text-ink/65">{[property.address1, property.city, property.state, property.postalCode].filter(Boolean).join(", ")}</p>
      </Panel>
      <Panel>
        <h2 className="text-xl font-semibold">Service profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Customer</div>
            <div className="mt-2 text-xl font-semibold">{customer?.name || "Unknown customer"}</div>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-ink/45">Square footage</div>
            <div className="mt-2 text-xl font-semibold">{property.sqft || 0}</div>
          </div>
        </div>
        {property.infestationNotes ? (
          <div className="mt-5 rounded-2xl border border-ink/10 px-4 py-4 text-sm text-ink/75">{property.infestationNotes}</div>
        ) : null}
      </Panel>
    </div>
  );
}
