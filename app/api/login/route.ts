import { NextResponse } from "next/server";
import { session } from "@/lib/auth";

/**
 * Authenticates the user by validating the admin passphrase.
 * @param req - Request containing passphrase and optional orgId.
 * @returns Response indicating authentication success or failure.
 * @example
 * ```ts
 * await fetch("/api/login", { method: "POST", body: JSON.stringify({ passphrase: "secret" }) });
 * ```
 */
export async function POST(req: Request) {
  const { passphrase, orgId="default" } = await req.json();
  if (passphrase !== process.env.ADMIN_PASSPHRASE) {
    return NextResponse.json({ ok:false }, { status: 401 });
  }
  const s = await session();
  s.authed = true; s.orgId = orgId;
  await s.save();
  return NextResponse.json({ ok:true });
}
