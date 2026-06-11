import { randomUUID } from "crypto";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import {
  Customer,
  EmailMessage,
  Organization,
  Quote,
  QuoteAcceptance,
  QuoteAttachment,
  QuoteDraftPayload,
  QuoteLine,
  QuoteRevision
} from "@/domain/types";
import { calculatePricing } from "@/domain/pricing";
import { currency, nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { ensureJobsForAcceptedQuote } from "@/server/services/jobs";
import { createPortalToken, touchPortalToken, validatePortalToken } from "@/server/services/portal";
import { writeAuditEvent } from "@/server/services/audit";

export async function listQuotes(organizationId: string) {
  const quotes = await getStore().list<Quote>("quotes", { organizationId });
  return quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getQuote(quoteId: string) {
  return getStore().get<Quote>("quotes", quoteId);
}

export async function getQuoteRevision(revisionId: string) {
  return getStore().get<QuoteRevision>("quoteRevisions", revisionId);
}

export async function getQuoteLines(quoteId: string, organizationId: string) {
  const lines = await getStore().list<QuoteLine>("quoteLines", { organizationId, quoteId });
  return lines.sort((a, b) => a.lineNumber - b.lineNumber);
}

export async function getQuoteAttachments(quoteId: string, organizationId: string) {
  const attachments = await getStore().list<QuoteAttachment>("quoteAttachments", {
    organizationId,
    quoteId
  });
  return attachments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createQuoteDraft(input: {
  organizationId: string;
  actorUserId: string;
  customer: Customer;
  propertyId?: string;
  title: string;
  payload: QuoteDraftPayload;
}) {
  const timestamp = nowIso();
  const pricing = calculatePricing(input.payload);
  const quoteId = randomUUID();
  const revisionId = randomUUID();
  const quote: Quote = {
    id: quoteId,
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    customerId: input.customer.id,
    propertyId: input.propertyId,
    quoteNumber: await nextDocumentNumber("Q"),
    status: "DRAFT",
    title: input.title,
    serviceAddressSnapshot: input.payload.propertyAddress,
    customerNameSnapshot: input.customer.name,
    subtotal: pricing.subtotal,
    taxTotal: pricing.taxTotal,
    grandTotal: pricing.grandTotal,
    currencyCode: "USD",
    currentRevisionId: revisionId
  };

  const revision: QuoteRevision = {
    id: revisionId,
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    quoteId,
    revisionNumber: 1,
    payload: input.payload,
    subtotal: pricing.subtotal,
    taxTotal: pricing.taxTotal,
    grandTotal: pricing.grandTotal,
    revisedAt: timestamp,
    revisedBy: input.actorUserId,
    notes: input.payload.notes
  };

  const lines: QuoteLine[] = pricing.lineItems.map((line, index) => ({
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    quoteId,
    revisionId,
    lineNumber: index + 1,
    description: line.description,
    category: line.category,
    qty: line.qty,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    taxable: line.taxable
  }));

  await getStore().putMany([
    { collection: "quotes", item: quote },
    { collection: "quoteRevisions", item: revision },
    ...lines.map((line) => ({ collection: "quoteLines" as const, item: line }))
  ]);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "quote.created",
    entityType: "Quote",
    entityId: quote.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ revisionId })
  });

  return { quote, revision, lines };
}

export async function sendQuote(input: {
  organizationId: string;
  actorUserId: string;
  quoteId: string;
  recipientEmail: string;
  organizationName?: string;
}) {
  const quote = await getQuote(input.quoteId);
  if (!quote || quote.organizationId !== input.organizationId) {
    throw new Error("Quote was not found");
  }

  const revision = await getQuoteRevision(quote.currentRevisionId);
  if (!revision) {
    throw new Error("Quote revision is missing");
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const { token, record } = await createPortalToken({
    organizationId: input.organizationId,
    entityType: "QUOTE",
    entityId: quote.id,
    expiresAt
  });

  const message: EmailMessage = {
    id: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    organizationId: input.organizationId,
    entityType: "QUOTE",
    entityId: quote.id,
    to: [input.recipientEmail],
    cc: [],
    subject: `Quote ${quote.quoteNumber} from ${input.organizationName ?? "Pestimator"}`,
    template: "QUOTE_SENT",
    provider: "SES",
    status: "QUEUED",
    payload: {
      portalUrl: `/portal/quotes/${token}`,
      expiresAt
    }
  };

  const updatedQuote: Quote = {
    ...quote,
    updatedAt: nowIso(),
    status: "SENT",
    sentAt: nowIso(),
    expiresAt
  };

  await getStore().putMany([
    { collection: "quotes", item: updatedQuote },
    { collection: "emailMessages", item: message }
  ]);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "quote.sent",
    entityType: "Quote",
    entityId: quote.id,
    occurredAt: nowIso(),
    payload: JSON.stringify({ emailMessageId: message.id, portalTokenId: record.id })
  });

  return { quote: updatedQuote, portalToken: token, emailMessage: message, revision };
}

export async function acceptQuote(input: {
  token: string;
  acceptedByName: string;
  acceptedByEmail?: string;
  ip: string;
  userAgent?: string;
}) {
  const portalToken = await validatePortalToken(input.token, "QUOTE");
  const quote = await getQuote(portalToken.entityId);
  if (!quote) {
    throw new Error("Quote was not found");
  }

  const timestamp = nowIso();
  const acceptance: QuoteAcceptance = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: quote.organizationId,
    quoteId: quote.id,
    acceptedByName: input.acceptedByName,
    acceptedByEmail: input.acceptedByEmail,
    acceptedAt: timestamp,
    acceptedIp: input.ip,
    acceptedUserAgent: input.userAgent
  };

  const acceptedQuote: Quote = {
    ...quote,
    updatedAt: timestamp,
    status: "ACCEPTED",
    acceptedAt: timestamp,
    viewedAt: quote.viewedAt ?? timestamp
  };
  const usedToken: typeof portalToken = {
    ...portalToken,
    updatedAt: timestamp,
    usedAt: timestamp,
    lastViewedAt: timestamp,
    lastViewedIp: input.ip,
    lastViewedUserAgent: input.userAgent
  };

  await getStore().putMany([
    { collection: "quoteAcceptances", item: acceptance },
    { collection: "quotes", item: acceptedQuote },
    { collection: "portalAccessTokens", item: usedToken }
  ]);

  await writeAuditEvent({
    organizationId: quote.organizationId,
    action: "quote.accepted",
    entityType: "Quote",
    entityId: quote.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ acceptanceId: acceptance.id })
  });

  // Accepted work immediately lands on the schedule (or the unscheduled
  // tray) so nothing falls through the cracks between sales and service.
  await ensureJobsForAcceptedQuote({ ...quote, status: "ACCEPTED" });

  return acceptance;
}

export async function declineQuote(input: { token: string; ip: string; userAgent?: string }) {
  const portalToken = await validatePortalToken(input.token, "QUOTE");
  const quote = await getQuote(portalToken.entityId);
  if (!quote) {
    throw new Error("Quote was not found");
  }

  const timestamp = nowIso();
  const declinedQuote: Quote = {
    ...quote,
    updatedAt: timestamp,
    status: "DECLINED",
    declinedAt: timestamp,
    viewedAt: quote.viewedAt ?? timestamp
  };
  const usedToken: typeof portalToken = {
    ...portalToken,
    updatedAt: timestamp,
    usedAt: timestamp,
    lastViewedAt: timestamp,
    lastViewedIp: input.ip,
    lastViewedUserAgent: input.userAgent
  };

  await getStore().putMany([
    { collection: "quotes", item: declinedQuote },
    { collection: "portalAccessTokens", item: usedToken }
  ]);

  await writeAuditEvent({
    organizationId: quote.organizationId,
    action: "quote.declined",
    entityType: "Quote",
    entityId: quote.id,
    occurredAt: timestamp,
    payload: JSON.stringify({})
  });
}

export async function viewQuoteInPortal(input: { token: string; ip?: string; userAgent?: string }) {
  const portalToken = await validatePortalToken(input.token, "QUOTE");
  const quote = await getQuote(portalToken.entityId);
  if (!quote) {
    throw new Error("Quote was not found");
  }

  const timestamp = nowIso();
  const viewedQuote =
    quote.status === "SENT"
      ? {
          ...quote,
          updatedAt: timestamp,
          status: "VIEWED" as const,
          viewedAt: quote.viewedAt || timestamp
        }
      : {
          ...quote,
          updatedAt: timestamp,
          viewedAt: quote.viewedAt || timestamp
        };

  await Promise.all([
    quote.status === "SENT" || !quote.viewedAt ? getStore().put("quotes", viewedQuote) : Promise.resolve(viewedQuote),
    touchPortalToken(portalToken, { ip: input.ip, userAgent: input.userAgent })
  ]);

  if (quote.status === "SENT") {
    await writeAuditEvent({
      organizationId: quote.organizationId,
      action: "quote.viewed",
      entityType: "Quote",
      entityId: quote.id,
      occurredAt: timestamp,
      payload: JSON.stringify({ portalTokenId: portalToken.id })
    });
  }

  return { quote: viewedQuote, portalToken };
}

export async function renderQuotePdf(
  quote: Quote,
  revision: QuoteRevision,
  lines: QuoteLine[],
  organization?: Organization | null
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.13, 0.11);
  const muted = rgb(0.42, 0.47, 0.45);
  const emerald = rgb(0.06, 0.56, 0.45);
  const lineColor = rgb(0.88, 0.9, 0.89);

  const companyName = organization?.name ?? "Pestimator";
  const contactBits = [
    organization?.supportPhone,
    organization?.supportEmail,
    organization?.website
  ].filter(Boolean) as string[];

  // Header band
  page.drawRectangle({ x: 0, y: 752, width: 612, height: 40, color: rgb(0.07, 0.19, 0.15) });
  page.drawText(companyName, { x: 40, y: 766, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText("SERVICE QUOTE", { x: 612 - 40 - bold.widthOfTextAtSize("SERVICE QUOTE", 11), y: 768, size: 11, font: bold, color: rgb(1, 1, 1) });

  let y = 724;
  if (contactBits.length > 0) {
    page.drawText(contactBits.join("   |   "), { x: 40, y, size: 9, font, color: muted });
    y -= 14;
  }
  if (organization?.licenseNumber) {
    page.drawText(`License #: ${organization.licenseNumber}`, { x: 40, y, size: 9, font, color: muted });
    y -= 14;
  }
  y -= 8;

  const meta: Array<[string, string]> = [
    ["Quote #", quote.quoteNumber],
    ["Date", new Date(quote.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })],
    ["Prepared for", quote.customerNameSnapshot],
    ["Service address", quote.serviceAddressSnapshot]
  ];
  for (const [label, value] of meta) {
    page.drawText(label, { x: 40, y, size: 9, font: bold, color: muted });
    page.drawText(value, { x: 150, y, size: 10, font, color: ink });
    y -= 16;
  }

  // Line items table
  y -= 12;
  page.drawRectangle({ x: 40, y: y - 4, width: 532, height: 20, color: rgb(0.95, 0.96, 0.96) });
  page.drawText("DESCRIPTION", { x: 48, y, size: 9, font: bold, color: muted });
  page.drawText("AMOUNT", { x: 572 - bold.widthOfTextAtSize("AMOUNT", 9), y, size: 9, font: bold, color: muted });
  y -= 22;

  lines.forEach((line) => {
    page.drawText(line.description.slice(0, 80), { x: 48, y, size: 10, font, color: ink });
    const amount = currency(line.lineTotal);
    page.drawText(amount, { x: 572 - font.widthOfTextAtSize(amount, 10), y, size: 10, font, color: ink });
    y -= 6;
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.5, color: lineColor });
    y -= 12;
  });

  // Totals
  y -= 8;
  const totals: Array<[string, string, boolean]> = [
    ["Subtotal", currency(quote.subtotal), false],
    ["Tax", currency(quote.taxTotal), false],
    ["Total", currency(quote.grandTotal), true]
  ];
  for (const [label, value, emphasize] of totals) {
    const size = emphasize ? 13 : 10;
    const face = emphasize ? bold : font;
    const color = emphasize ? emerald : ink;
    page.drawText(label, { x: 420, y, size, font: face, color });
    page.drawText(value, { x: 572 - face.widthOfTextAtSize(value, size), y, size, font: face, color });
    y -= emphasize ? 22 : 16;
  }

  // Scope of work, wrapped
  y -= 8;
  page.drawText("Scope of work", { x: 40, y, size: 11, font: bold, color: ink });
  y -= 16;
  for (const wrapped of wrapText(revision.payload.serviceScope, font, 9.5, 532)) {
    if (y < 80) break;
    page.drawText(wrapped, { x: 40, y, size: 9.5, font, color: ink });
    y -= 13;
  }

  // Footer
  const footerBits = [
    organization?.defaultTerms ? `Terms: ${organization.defaultTerms}` : null,
    organization?.licenseNumber ? `License #${organization.licenseNumber}` : null,
    organization?.legalName ?? companyName
  ].filter(Boolean) as string[];
  page.drawLine({ start: { x: 40, y: 56 }, end: { x: 572, y: 56 }, thickness: 0.5, color: lineColor });
  page.drawText(footerBits.join("   |   "), { x: 40, y: 42, size: 8.5, font, color: muted });

  return Buffer.from(await pdf.save());
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const linesOut: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      linesOut.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) linesOut.push(current);
  return linesOut;
}

async function nextDocumentNumber(prefix: "Q") {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existing = await getStore().list<Quote>("quotes");
  const count = existing.filter((item) => item.quoteNumber.startsWith(prefix + today)).length + 1;
  return `${prefix}${today}-${String(count).padStart(4, "0")}`;
}
