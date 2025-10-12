import { cookies as nextCookies } from 'next/headers';
import { getIronSession, IronSessionOptions } from 'iron-session';

export type SessionUser = {
  id: string;
  organizationId: string;
  role: 'Owner' | 'Manager' | 'Estimator' | 'Viewer';
  email: string;
  name: string;
};
export type SessionData = { user?: SessionUser };

export const sessionOptions: IronSessionOptions = {
  cookieName: process.env.SESSION_COOKIE_NAME || 'pestpro_session',
  password: process.env.SESSION_PASSWORD!,
  ttl: 60 * 60 * 24 * 7,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
};

/**
 * Retrieves the iron-session wrapper for the current request.
 * @param store Optional cookie store override.
 * @returns The hydrated iron-session instance.
 * @example
 * const session = await getSession();
 */
export async function getSession(store?: ReturnType<typeof nextCookies>) {
  const c = store ?? nextCookies();
  return getIronSession<SessionData>(c, sessionOptions);
}

/**
 * Loads the active session user or throws when unauthenticated.
 * @param store Optional cookie store override.
 * @returns The authenticated session user object.
 * @example
 * const user = await requireSession();
 */
export async function requireSession(store?: ReturnType<typeof nextCookies>) {
  const s = await getSession(store);
  if (!s.user) {
    throw new Error('UNAUTHORIZED');
  }
  return s.user;
}
