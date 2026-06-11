import { randomUUID } from "crypto";
import { EmailMessage, OrganizationMembership, RoleName } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";

export async function listTeamMembers(organizationId: string) {
  const memberships = await getStore().list<OrganizationMembership>("organizationMemberships", {
    organizationId
  });
  return memberships.sort((a, b) => a.email.localeCompare(b.email));
}

export async function updateTeamMember(input: {
  organizationId: string;
  actorUserId: string;
  membershipId: string;
  role?: RoleName;
  status?: "ACTIVE" | "DISABLED";
}) {
  const membership = await getStore().get<OrganizationMembership>("organizationMemberships", input.membershipId);
  if (!membership || membership.organizationId !== input.organizationId) {
    throw new Error("Team member was not found");
  }

  const nextRole = input.role ?? membership.role;
  const nextStatus = input.status ?? membership.status;

  // Never let the workspace end up without an active owner.
  const losesOwner =
    membership.role === "OWNER" && membership.status === "ACTIVE" && (nextRole !== "OWNER" || nextStatus !== "ACTIVE");
  if (losesOwner) {
    const members = await listTeamMembers(input.organizationId);
    const otherActiveOwners = members.filter(
      (member) => member.id !== membership.id && member.role === "OWNER" && member.status === "ACTIVE"
    );
    if (otherActiveOwners.length === 0) {
      throw new Error("The workspace needs at least one active owner");
    }
  }

  const timestamp = nowIso();
  const updated: OrganizationMembership = {
    ...membership,
    updatedAt: timestamp,
    role: nextRole,
    status: nextStatus
  };

  await getStore().put("organizationMemberships", updated);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "team.updated",
    entityType: "OrganizationMembership",
    entityId: membership.id,
    occurredAt: timestamp,
    payload: JSON.stringify({
      before: { role: membership.role, status: membership.status },
      after: { role: updated.role, status: updated.status }
    })
  });

  return updated;
}

export async function inviteTeamMember(input: {
  organizationId: string;
  actorUserId: string;
  email: string;
  displayName?: string;
  role: RoleName;
  organizationName?: string;
}) {
  const existing = await getStore().list<OrganizationMembership>("organizationMemberships", {
    organizationId: input.organizationId,
    email: input.email
  });

  if (existing.length > 0) {
    throw new Error("That email address already has a membership for this organization");
  }

  const timestamp = nowIso();
  const membership: OrganizationMembership = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    status: "INVITED",
    branchIds: [],
    invitedAt: timestamp
  };

  const emailMessage: EmailMessage = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    entityType: "TEAM_INVITE",
    entityId: membership.id,
    to: [input.email],
    cc: [],
    subject: `You have been invited to ${input.organizationName ?? "Pestimator"}`,
    template: "TEAM_INVITE",
    provider: "SES",
    status: "QUEUED",
    payload: {
      role: input.role
    }
  };

  await Promise.all([
    getStore().put("organizationMemberships", membership),
    getStore().put("emailMessages", emailMessage)
  ]);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "team.invited",
    entityType: "OrganizationMembership",
    entityId: membership.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ role: input.role, email: input.email })
  });

  return { membership, emailMessage };
}
