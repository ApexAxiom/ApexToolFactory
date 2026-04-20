import { PestimatorSession } from "@/server/auth/types";
import { ensureOrganizationMembership, getOrganization } from "@/server/services/organizations";

export async function getActiveOrganizationContext(session: PestimatorSession) {
  const membership = session.memberships[0];
  if (!membership) {
    return null;
  }

  const organization = await getOrganization(membership.organizationId);
  if (!organization) {
    return null;
  }

  return {
    organization,
    membership: await ensureOrganizationMembership(session, membership.organizationId)
  };
}
