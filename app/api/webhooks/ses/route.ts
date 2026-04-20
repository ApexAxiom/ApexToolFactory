import { NextResponse } from "next/server";
import { ingestSesEvent } from "@/server/services/email";

interface SnsEnvelope {
  Type?: string;
  SubscribeURL?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const parsed = JSON.parse(body) as SnsEnvelope;

    if (parsed.Type === "SubscriptionConfirmation" && parsed.SubscribeURL) {
      await fetch(parsed.SubscribeURL);
      return NextResponse.json({ ok: true, subscribed: true });
    }

    const event = await ingestSesEvent(body);
    return NextResponse.json({ ok: true, eventType: event.eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SES webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
