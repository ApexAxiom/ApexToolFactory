import { NextResponse } from "next/server";
import { session } from "@/lib/auth";

/**
 * Clears the active user session.
 * @returns Success response after destroying the session.
 * @example
 * ```ts
 * await fetch("/api/logout", { method: "POST" });
 * ```
 */
export async function POST() {
  const s = await session(); s.destroy();
  return NextResponse.json({ ok:true });
}
