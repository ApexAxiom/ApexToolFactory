import { NextResponse } from "next/server";
import { requestVisitFromPortal } from "@/server/services/customer-portal";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const formData = await request.formData();
  const preferredDate = String(formData.get("preferredDate") || "").trim();
  const notes = String(formData.get("notes") || "").trim().slice(0, 2000);

  try {
    await requestVisitFromPortal({
      token,
      preferredDate: /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) ? preferredDate : undefined,
      notes: notes || undefined
    });
  } catch {
    return NextResponse.redirect(new URL(`/portal/account/${token}?error=request`, request.url));
  }

  return NextResponse.redirect(new URL(`/portal/account/${token}?requested=1`, request.url));
}
