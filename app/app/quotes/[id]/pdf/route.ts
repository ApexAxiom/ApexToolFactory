import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { getQuote, getQuoteLines, getQuoteRevision, renderQuotePdf } from "@/server/services/quotes";

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
  const quote = await getQuote(id);
  if (!quote || quote.organizationId !== context.organization.id) {
    return NextResponse.json({ ok: false, error: "Quote was not found" }, { status: 404 });
  }

  const revision = await getQuoteRevision(quote.currentRevisionId);
  if (!revision) {
    return NextResponse.json({ ok: false, error: "Quote revision is missing" }, { status: 404 });
  }

  const lines = await getQuoteLines(quote.id, context.organization.id);
  const pdf = await renderQuotePdf(quote, revision, lines);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`
    }
  });
}
