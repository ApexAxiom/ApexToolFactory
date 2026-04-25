import { PestimatorSession } from "@/server/auth/types";
import { env } from "@/config/env";
import {
  createOrganization,
  ensureOrganizationMembership,
  getOrganization,
  listOrganizationsForSession
} from "@/server/services/organizations";

export async function getActiveOrganizationContext(session: PestimatorSession) {
  const membership = session.memberships[0];
  if (membership) {
    const organization = await getOrganization(membership.organizationId);
    if (organization) {
      return {
        organization,
        membership: await ensureOrganizationMembership(session, membership.organizationId)
      };
    }
  }

  const [organization] = await listOrganizationsForSession(session);
  if (organization) {
    return {
      organization,
      membership: await ensureOrganizationMembership(session, organization.id)
    };
  }

  if (shouldCreateLocalDevOrganization(session)) {
    const created = await createOrganization({
      name: "Pestimator Local Workspace",
      timezone: "America/Chicago",
      owner: session
    });

    return {
      organization: created.organization,
      membership: created.membership
    };
  }

  return null;
}

function shouldCreateLocalDevOrganization(session: PestimatorSession) {
  return (
    env.LOCAL_DEV_LOGIN_ENABLED === "true" &&
    Boolean(env.LOCAL_DEV_LOGIN_EMAIL) &&
    session.email.toLowerCase() === env.LOCAL_DEV_LOGIN_EMAIL?.toLowerCase()
  );
}
