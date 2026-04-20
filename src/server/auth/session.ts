import { cookies } from "next/headers";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { PestimatorSession } from "@/server/auth/types";

const cookieName = "pestimator.session";
const secret = new TextEncoder().encode(
  env.SESSION_SECRET || "development-session-secret-at-least-32chars"
);

export async function createSessionCookie(session: PestimatorSession) {
  const token = await new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSession(): Promise<PestimatorSession | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PestimatorSession;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function decodeIdToken(token: string) {
  return decodeJwt(token) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    sub?: string;
  };
}
