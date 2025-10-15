import { getSession, requireUser, withSessionRoute } from './auth/session';

export { getSession, requireUser, withSessionRoute };
export type { SessionData, SessionUser } from './auth/session';
export { sessionOptions } from './auth/sessionOptions';

export const requireSession = requireUser;
