import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/server/services/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const eventType = await handleStripeWebhook(body, request.headers.get("stripe-signature"));
    return NextResponse.json({ ok: true, eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
