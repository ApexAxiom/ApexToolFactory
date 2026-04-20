import { NextResponse } from "next/server";
import { acceptQuote } from "@/server/services/quotes";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const formData = await request.formData();
  const acceptedByName = String(formData.get("acceptedByName") || "").trim();

  if (!acceptedByName) {
    return NextResponse.redirect(new URL(`/portal/quotes/${token}?error=name`, request.url));
  }

  await acceptQuote({
    token,
    acceptedByName,
    acceptedByEmail: String(formData.get("acceptedByEmail") || "").trim() || undefined,
    ip: getRequestIp(request.headers),
    userAgent: getUserAgent(request.headers)
  });

  return NextResponse.redirect(new URL(`/portal/quotes/${token}?accepted=1`, request.url));
}
