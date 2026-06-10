import { NextResponse } from "next/server";
import { ingestSesEvent } from "@/server/services/email";
import { SnsMessage, assertValidSnsUrl, verifySnsMessage } from "@/server/services/sns";

export async function POST(request: Request) {
  let parsed: Partial<SnsMessage>;
  try {
    parsed = JSON.parse(await request.text()) as Partial<SnsMessage>;
  } catch {
    return NextResponse.json({ ok: false, error: "Request body was not valid JSON" }, { status: 400 });
  }

  if (!parsed.Type || !parsed.Signature || !parsed.SigningCertURL) {
    return NextResponse.json({ ok: false, error: "Request is not a signed SNS message" }, { status: 403 });
  }

  try {
    await verifySnsMessage(parsed as SnsMessage);
  } catch {
    return NextResponse.json({ ok: false, error: "SNS signature verification failed" }, { status: 403 });
  }

  try {
    if (parsed.Type === "SubscriptionConfirmation" && parsed.SubscribeURL) {
      await fetch(assertValidSnsUrl(parsed.SubscribeURL).toString());
      return NextResponse.json({ ok: true, subscribed: true });
    }

    const event = await ingestSesEvent(parsed.Message ?? "{}");
    return NextResponse.json({ ok: true, eventType: event.eventType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SES webhook failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
