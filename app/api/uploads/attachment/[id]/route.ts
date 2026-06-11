import { NextResponse } from "next/server";
import { QuoteAttachment } from "@/domain/types";
import { getSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getStore } from "@/server/persistence/store";
import { createDownloadUrl } from "@/server/services/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const context = await getActiveOrganizationContext(session);
  if (!context) {
    return NextResponse.json({ ok: false, error: "No active organization" }, { status: 403 });
  }

  const { id } = await params;
  const attachment = await getStore().get<QuoteAttachment>("quoteAttachments", id);
  if (!attachment || attachment.organizationId !== context.organization.id) {
    return NextResponse.json({ ok: false, error: "Attachment was not found" }, { status: 404 });
  }

  try {
    const url = await createDownloadUrl(attachment.storageKey);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
