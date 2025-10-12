import type { IronSessionOptions } from 'iron-session';
import { getIronSession } from 'iron-session';
import type { cookies } from 'next/headers';
import { prisma } from './db';

export interface SessionUser {
  id: string;
  organizationId: string;
  role: 'Owner' | 'Manager' | 'Estimator' | 'Viewer';
  email: string;
  name: string;
}

export interface AppSession {
  user?: SessionUser;
}

const sessionOptions: IronSessionOptions = {
  cookieName: 'pestquote_session',
  password: process.env.SESSION_PASSWORD ?? 'insecure-development-password-change-me',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

export async function getSession(cookieStore: ReturnType<typeof cookies>) {
  return getIronSession<AppSession>(cookieStore, sessionOptions);
}

export async function requireSession(cookieStore: ReturnType<typeof cookies>) {
  const session = await getSession(cookieStore);
  if (!session.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

/**
 * Fetches the active user ensuring they belong to the current organization.
 * @param userId The user identifier from the session.
 * @returns The hydrated user record.
 * @example
 * await loadActiveUser(session.user.id);
 */
export async function loadActiveUser(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
}
