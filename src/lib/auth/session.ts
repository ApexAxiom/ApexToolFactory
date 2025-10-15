import 'server-only';

import type { IronSession } from 'iron-session';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { sessionOptions } from './sessionOptions';

export type SessionUser = { userId: string; orgId: string | null };
export type SessionData = { user?: SessionUser };

type NextCookies = ReturnType<typeof cookies>;
type ResponseCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  expires?: Date | number;
  priority?: 'low' | 'medium' | 'high';
};

type SessionCookieStore = {
  get: (name: string) => { name: string; value: string } | undefined;
  set: {
    (name: string, value: string, cookie?: Partial<ResponseCookie>): void;
    (options: ResponseCookie): void;
  };
};

function resolveStore(store?: NextCookies | SessionCookieStore): SessionCookieStore {
  if (store) {
    return store as SessionCookieStore;
  }
  return cookies() as unknown as SessionCookieStore;
}

/**
 * Reads the iron-session payload for the current request.
 * @param store Optional cookie store to reuse within middleware or route handlers.
 * @returns The hydrated session object with helper methods to mutate cookies.
 * @example
 * const session = await getSession();
 * session.user = { userId, orgId };
 * await session.save();
 */
export async function getSession(store?: NextCookies | SessionCookieStore): Promise<IronSession<SessionData>> {
  const cookieStore = resolveStore(store);
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Ensures a user is present on the session and redirects to /login otherwise.
 * @param store Optional cookie store reference for reuse.
 * @returns The authenticated user object from the session.
 * @example
 * const user = await requireUser();
 * console.log(user.userId);
 */
export async function requireUser(store?: NextCookies | SessionCookieStore): Promise<SessionUser> {
  const session = await getSession(store);
  if (!session.user) {
    redirect('/login');
  }
  return session.user;
}

/**
 * Wraps a route handler to automatically hydrate an iron-session instance.
 * @param handler The route handler that expects a session object.
 * @returns A function compatible with Next.js route handlers.
 * @example
 * export const GET = withSessionRoute(async (session) => {
 *   return NextResponse.json({ userId: session.user?.userId ?? null });
 * });
 */
export function withSessionRoute<Context extends Record<string, unknown> = Record<string, never>>(
  handler: (session: IronSession<SessionData>, req: NextRequest, context: Context) => Promise<Response> | Response,
) {
  return async (req: NextRequest, context: Context) => {
    const session = await getSession();
    return handler(session, req, context);
  };
}
