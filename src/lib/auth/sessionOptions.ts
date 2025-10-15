import type { SessionOptions } from 'iron-session';

export type IronSessionOptions = SessionOptions;

/**
 * Hardened iron-session configuration shared across server actions and route handlers.
 * @example
 * const session = await getIronSession(cookies(), sessionOptions);
 */
export const sessionOptions: IronSessionOptions = {
  cookieName: 'aa.sid',
  password: process.env.SESSION_PASSWORD!,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
};
