import { randomUUID } from "crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  Customer,
  EmailMessage,
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

  await Promise.all([
    getStore().put("quotes", quote),
    getStore().put("quoteRevisions", revision),
    ...lines.map((line) => getStore().put("quoteLines", line))
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
    subject: `Quote ${quote.quoteNumber} from Pestimator`,
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

  await Promise.all([
    getStore().put("quotes", updatedQuote),
    getStore().put("emailMessages", message)
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

  await Promise.all([
    getStore().put("quoteAcceptances", acceptance),
    getStore().put("quotes", {
      ...quote,
      updatedAt: timestamp,
      status: "ACCEPTED",
      acceptedAt: timestamp,
      viewedAt: quote.viewedAt ?? timestamp
    }),
    getStore().put("portalAccessTokens", {
      ...portalToken,
      updatedAt: timestamp,
      usedAt: timestamp,
      lastViewedAt: timestamp,
      lastViewedIp: input.ip,
      lastViewedUserAgent: input.userAgent
    })
  ]);

  await writeAuditEvent({
    organizationId: quote.organizationId,
    action: "quote.accepted",
    entityType: "Quote",
    entityId: quote.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ acceptanceId: acceptance.id })
  });

  return acceptance;
}

export async function declineQuote(input: { token: string; ip: string; userAgent?: string }) {
  const portalToken = await validatePortalToken(input.token, "QUOTE");
  const quote = await getQuote(portalToken.entityId);
  if (!quote) {
    throw new Error("Quote was not found");
  }

  const timestamp = nowIso();
  await Promise.all([
    getStore().put("quotes", {
      ...quote,
      updatedAt: timestamp,
      status: "DECLINED",
      declinedAt: timestamp,
      viewedAt: quote.viewedAt ?? timestamp
    }),
    getStore().put("portalAccessTokens", {
      ...portalToken,
      updatedAt: timestamp,
      usedAt: timestamp,
      lastViewedAt: timestamp,
      lastViewedIp: input.ip,
      lastViewedUserAgent: input.userAgent
    })
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

export async function renderQuotePdf(quote: Quote, revision: QuoteRevision, lines: QuoteLine[]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 740;
  page.drawText("Pestimator Quote", { x: 40, y, size: 20, font: bold });
  y -= 28;
  page.drawText(`Quote #: ${quote.quoteNumber}`, { x: 40, y, size: 11, font });
  y -= 16;
  page.drawText(`Customer: ${quote.customerNameSnapshot}`, { x: 40, y, size: 11, font });
  y -= 16;
  page.drawText(`Service address: ${quote.serviceAddressSnapshot}`, { x: 40, y, size: 11, font });
  y -= 24;
  page.drawText("Line items", { x: 40, y, size: 13, font: bold });
  y -= 16;

  lines.forEach((line) => {
    page.drawText(`${line.description}`, { x: 40, y, size: 10, font });
    page.drawText(currency(line.lineTotal), { x: 480, y, size: 10, font });
    y -= 14;
  });

  y -= 20;
  page.drawText(`Subtotal: ${currency(quote.subtotal)}`, { x: 360, y, size: 11, font: bold });
  y -= 16;
  page.drawText(`Tax: ${currency(quote.taxTotal)}`, { x: 360, y, size: 11, font: bold });
  y -= 16;
  page.drawText(`Total: ${currency(quote.grandTotal)}`, { x: 360, y, size: 12, font: bold });
  y -= 26;
  page.drawText(`Scope: ${revision.payload.serviceScope}`, { x: 40, y, size: 10, font });

  return Buffer.from(await pdf.save());
}

async function nextDocumentNumber(prefix: "Q") {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existing = await getStore().list<Quote>("quotes");
  const count = existing.filter((item) => item.quoteNumber.startsWith(prefix + today)).length + 1;
  return `${prefix}${today}-${String(count).padStart(4, "0")}`;
}
