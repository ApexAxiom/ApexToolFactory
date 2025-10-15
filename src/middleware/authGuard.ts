import 'server-only';

import { requireUser } from '@/lib/auth/session';

export async function enforceAuthenticatedUser() {
  return requireUser();
}
