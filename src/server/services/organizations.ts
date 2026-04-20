import { randomUUID } from "crypto";
import { Branch, Organization, OrganizationMembership, Subscription } from "@/domain/types";
import { nowIso, slugify } from "@/lib/utils";
import { PestimatorSession } from "@/server/auth/types";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";

export async function listOrganizationsForSession(session: PestimatorSession) {
  const memberships = await getStore().list<OrganizationMembership>("organizationMemberships");
  const activeMemberships = memberships.filter(
    (membership) =>
      membership.status === "ACTIVE" &&
      (membership.userId === session.userId || membership.email.toLowerCase() === session.email.toLowerCase())
  );

  const organizations = await Promise.all(
    activeMemberships.map((membership) => getStore().get<Organization>("organizations", membership.organizationId))
  );

  return organizations.filter(Boolean) as Organization[];
}

export async function getOrganization(organizationId: string) {
  return getStore().get<Organization>("organizations", organizationId);
}

export async function ensureOrganizationMembership(session: PestimatorSession, organizationId: string) {
  const memberships = await getStore().list<OrganizationMembership>("organizationMemberships", { organizationId });
  const membership = memberships.find(
    (candidate) =>
      candidate.status === "ACTIVE" &&
      (candidate.userId === session.userId || candidate.email.toLowerCase() === session.email.toLowerCase())
  );

  if (!membership) {
    throw new Error("You do not have access to this organization");
  }

  return membership;
}

export async function createOrganization(input: {
  name: string;
  legalName?: string;
  timezone?: string;
  currencyCode?: string;
  owner: PestimatorSession;
}) {
  const timestamp = nowIso();
  const organization: Organization = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    name: input.name,
    legalName: input.legalName,
    timezone: input.timezone || "America/Chicago",
    currencyCode: input.currencyCode || "USD",
    defaultTaxPercent: 0,
    defaultTerms: "Net 14"
  };

  const branch: Branch = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: organization.id,
    name: "Main Branch",
    code: slugify(organization.name).slice(0, 8).toUpperCase() || "MAIN",
    isActive: true
  };

  const membership: OrganizationMembership = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: organization.id,
    userId: input.owner.userId,
    email: input.owner.email,
    displayName: input.owner.displayName,
    role: "OWNER",
    status: "ACTIVE",
    branchIds: [branch.id],
    acceptedAt: timestamp
  };

  const subscription: Subscription = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: organization.id,
    provider: "STRIPE",
    plan: "starter",
    status: "TRIALING",
    cancelAtPeriodEnd: false,
    currentPeriodStart: timestamp,
    currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
  };

  await Promise.all([
    getStore().put("organizations", organization),
    getStore().put("branches", branch),
    getStore().put("organizationMemberships", membership),
    getStore().put("subscriptions", subscription)
  ]);

  await writeAuditEvent({
    organizationId: organization.id,
    actorUserId: input.owner.userId,
    action: "organization.created",
    entityType: "Organization",
    entityId: organization.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ branchId: branch.id, membershipId: membership.id })
  });

  return { organization, branch, membership, subscription };
}
