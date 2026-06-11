import { NextResponse } from "next/server";
import { confirmJobFromPortal } from "@/server/services/customer-portal";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const formData = await request.formData();
  const confirmedByName = String(formData.get("confirmedByName") || "").trim().slice(0, 120);

  try {
    await confirmJobFromPortal({ token, confirmedByName: confirmedByName || undefined });
  } catch {
    return NextResponse.redirect(new URL(`/portal/visits/${token}?error=confirm`, request.url));
  }

  return NextResponse.redirect(new URL(`/portal/visits/${token}?confirmed=1`, request.url));
}
