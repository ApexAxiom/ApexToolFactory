import { NextResponse } from "next/server";
import { declineQuote } from "@/server/services/quotes";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  await declineQuote({
    token,
    ip: getRequestIp(request.headers),
    userAgent: getUserAgent(request.headers)
  });

  return NextResponse.redirect(new URL(`/portal/quotes/${token}?declined=1`, request.url));
}
