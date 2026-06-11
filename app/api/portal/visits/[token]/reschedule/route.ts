import { NextResponse } from "next/server";
import { requestJobRescheduleFromPortal } from "@/server/services/customer-portal";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const formData = await request.formData();
  const notes = String(formData.get("notes") || "").trim().slice(0, 2000);

  try {
    await requestJobRescheduleFromPortal({ token, notes: notes || undefined });
  } catch {
    return NextResponse.redirect(new URL(`/portal/visits/${token}?error=reschedule`, request.url));
  }

  return NextResponse.redirect(new URL(`/portal/visits/${token}?reschedule=1`, request.url));
}
