import 'server-only';

import { getSession } from './session';

/**
 * Fetches the orgId from the current session or throws when missing.
 * @returns The organization identifier bound to the logged-in user.
 * @example
 * const orgId = await requireOrgId();
 * await prisma.customer.findMany({ where: { orgId } });
 */
export async function requireOrgId(): Promise<string> {
  const session = await getSession();
  const orgId = session.user?.orgId ?? null;
  if (!orgId) {
    throw new Error('Unauthorized: missing orgId');
  }
  return orgId;
}
