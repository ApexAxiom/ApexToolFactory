import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

const sessionName = "aa.sid";

type ResponseCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
  maxAge?: number;
  priority?: "low" | "medium" | "high";
  expires?: number | Date;
};

type CookieStore = {
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, cookie?: Partial<ResponseCookie>): void;
} & {
  set(options: ResponseCookie): void;
};

export interface Sess {
  authed?: boolean;
  orgId?: string;
}

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function session(): Promise<IronSession<Sess>> {
  const password = requireEnv("SESSION_PASSWORD");
  const store = cookies();

  // Must be called in a Route Handler or Server Action so cookies are mutable
  if (typeof (store as any).set !== "function") {
    throw new Error(
      "Unable to access mutable cookies. Ensure session() is called within a Route Handler or Server Action."
    );
  }

  return getIronSession<Sess>(store as unknown as CookieStore, {
    cookieName: sessionName,
    password,
    ttl: 60 * 60 * 8,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  });
}