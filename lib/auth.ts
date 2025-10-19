import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { RequestCookies } from "next/dist/server/web/spec-extension/cookies";

const sessionName = "aa.sid";
export interface Sess { authed?: boolean; orgId?: string; }

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
  const cookieStore = cookies();

  if (typeof (cookieStore as Partial<RequestCookies>).set !== "function") {
    throw new Error("Unable to access mutable cookies. Ensure session() is called within a Route Handler or Server Action.");
  }

  return getIronSession<Sess>(cookieStore as unknown as RequestCookies, {
    cookieName: sessionName,
    password,
    ttl: 60 * 60 * 8,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
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
