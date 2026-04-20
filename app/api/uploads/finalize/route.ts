import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { finalizeQuoteAttachment } from "@/server/services/storage";

interface FinalizeBody {
  quoteId?: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  capturedAt?: string;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const context = await getActiveOrganizationContext(session);
    if (!context) {
      return NextResponse.json({ ok: false, error: "No active organization" }, { status: 403 });
    }

    const body = (await request.json()) as FinalizeBody;
    const attachment = await finalizeQuoteAttachment({
      organizationId: context.organization.id,
      actorUserId: session.userId,
      quoteId: String(body.quoteId || "").trim(),
      storageKey: String(body.storageKey || "").trim(),
      fileName: String(body.fileName || "").trim(),
      mimeType: String(body.mimeType || "application/octet-stream"),
      size: Number(body.size || 0),
      capturedAt: body.capturedAt
    });

    return NextResponse.json({ ok: true, attachment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload finalize failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
