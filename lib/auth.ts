import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

const sessionName = "aa.sid";
export interface Sess { authed?: boolean; orgId?: string; }
type CookieArg = Parameters<typeof getIronSession>[0];
type CookieStore = Extract<CookieArg, { get: (name: string) => unknown }>;

/**
 * Retrieves or initializes the iron-session for the current request.
 * @returns Iron session instance containing authentication state.
 * @example
 * ```ts
 * const sess = await session();
 * if (sess.authed) {
 *   // authenticated
 * }
 * ```
 */
export async function session(): Promise<IronSession<Sess>> {
  const password = requireEnv("SESSION_PASSWORD");
  const cookieStore = cookies() as unknown as CookieStore;
  return getIronSession<Sess>(cookieStore, {
    cookieName: sessionName,
    password,
    ttl: 60 * 60 * 8,
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax" }
  });
}

/**
 * Ensures the specified environment variable is set.
 * @param name - Environment variable key to fetch.
 * @returns The environment variable value.
 * @example
 * ```ts
 * const bucket = requireEnv("S3_BUCKET");
 * ```
 */
export function requireEnv(name:string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
