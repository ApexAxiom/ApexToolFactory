import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { createUploadUrl } from "@/server/services/storage";
import { getQuote } from "@/server/services/quotes";

interface PresignBody {
  quoteId?: string;
  fileName?: string;
  contentType?: string;
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const context = await getActiveOrganizationContext(session);
    if (!context) {
      return NextResponse.json({ ok: false, error: "No active organization" }, { status: 403 });
    }

    const body = (await request.json()) as PresignBody;
    const quoteId = String(body.quoteId || "").trim();
    const quote = await getQuote(quoteId);

    if (!quote || quote.organizationId !== context.organization.id) {
      return NextResponse.json({ ok: false, error: "Quote was not found" }, { status: 404 });
    }

    const upload = await createUploadUrl({
      organizationId: context.organization.id,
      quoteId,
      fileName: String(body.fileName || "").trim(),
      contentType: String(body.contentType || "application/octet-stream")
    });

    return NextResponse.json({ ok: true, ...upload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload presign failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
