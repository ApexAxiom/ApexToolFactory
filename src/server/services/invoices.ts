import { randomUUID } from "crypto";
import { EmailMessage, Invoice, InvoiceLine, Payment, Quote, QuoteLine } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { createPortalToken, touchPortalToken, validatePortalToken } from "@/server/services/portal";
import { writeAuditEvent } from "@/server/services/audit";

export async function listInvoices(organizationId: string) {
  const invoices = await getStore().list<Invoice>("invoices", { organizationId });
  return invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInvoice(invoiceId: string) {
  return getStore().get<Invoice>("invoices", invoiceId);
}

export async function getInvoiceLines(invoiceId: string, organizationId: string) {
  const lines = await getStore().list<InvoiceLine>("invoiceLines", { organizationId, invoiceId });
  return lines.sort((a, b) => a.lineNumber - b.lineNumber);
}

export async function issueInvoiceFromQuote(input: {
  organizationId: string;
  actorUserId: string;
  quote: Quote;
  quoteLines: QuoteLine[];
}) {
  const timestamp = nowIso();
  const invoiceId = randomUUID();
  const invoice: Invoice = {
    id: invoiceId,
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    customerId: input.quote.customerId,
    propertyId: input.quote.propertyId,
    quoteId: input.quote.id,
    invoiceNumber: await nextInvoiceNumber(),
    status: "ISSUED",
    issueDate: timestamp,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    subtotal: input.quote.subtotal,
    taxTotal: input.quote.taxTotal,
    grandTotal: input.quote.grandTotal,
    paidTotal: 0,
    outstandingTotal: input.quote.grandTotal,
    currencyCode: input.quote.currencyCode
  };

  const lines: InvoiceLine[] = input.quoteLines.map((line) => ({
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    invoiceId,
    lineNumber: line.lineNumber,
    description: line.description,
    qty: line.qty,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    taxable: line.taxable
  }));

  await getStore().putMany([
    { collection: "invoices", item: invoice },
    ...lines.map((line) => ({ collection: "invoiceLines" as const, item: line }))
  ]);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "invoice.issued",
    entityType: "Invoice",
    entityId: invoice.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ quoteId: input.quote.id })
  });

  return { invoice, lines };
}

export async function sendInvoice(input: {
  organizationId: string;
  actorUserId: string;
  invoiceId: string;
  recipientEmail: string;
  organizationName?: string;
  kind?: "INITIAL" | "REMINDER";
}) {
  const invoice = await getInvoice(input.invoiceId);
  if (!invoice || invoice.organizationId !== input.organizationId) {
    throw new Error("Invoice was not found");
  }

  const kind = input.kind ?? "INITIAL";
  const companyName = input.organizationName ?? "Pestimator";
  const { token } = await createPortalToken({
    organizationId: input.organizationId,
    entityType: "INVOICE",
    entityId: invoice.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  });

  const message: EmailMessage = {
    id: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    organizationId: input.organizationId,
    entityType: "INVOICE",
    entityId: invoice.id,
    to: [input.recipientEmail],
    cc: [],
    subject:
      kind === "REMINDER"
        ? `Payment reminder: invoice ${invoice.invoiceNumber} from ${companyName}`
        : `Invoice ${invoice.invoiceNumber} from ${companyName}`,
    template: kind === "REMINDER" ? "REMINDER" : "INVOICE_SENT",
    provider: "SES",
    status: "QUEUED",
    payload: {
      portalUrl: `/portal/invoices/${token}`
    }
  };

  await getStore().put("emailMessages", message);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: kind === "REMINDER" ? "invoice.reminder_sent" : "invoice.sent",
    entityType: "Invoice",
    entityId: invoice.id,
    occurredAt: nowIso(),
    payload: JSON.stringify({ emailMessageId: message.id })
  });

  return { invoice, emailMessage: message, portalToken: token };
}

/**
 * Issued/partial invoices past their due date render as OVERDUE without a
 * background job mutating rows.
 */
export function effectiveInvoiceStatus(invoice: Invoice, now = new Date()): Invoice["status"] {
  if (
    (invoice.status === "ISSUED" || invoice.status === "PARTIAL") &&
    invoice.outstandingTotal > 0 &&
    invoice.dueDate &&
    new Date(invoice.dueDate).getTime() < now.getTime()
  ) {
    return "OVERDUE";
  }
  return invoice.status;
}

export async function recordPayment(input: {
  organizationId: string;
  invoiceId: string;
  amount: number;
  method: string;
  provider: "STRIPE" | "MANUAL";
  reference?: string;
}) {
  const invoice = await getInvoice(input.invoiceId);
  if (!invoice) {
    throw new Error("Invoice was not found");
  }

  const timestamp = nowIso();
  const payment: Payment = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    amount: input.amount,
    currencyCode: invoice.currencyCode,
    paymentDate: timestamp,
    method: input.method,
    status: "SUCCEEDED",
    provider: input.provider,
    reference: input.reference
  };

  const nextPaidTotal = invoice.paidTotal + input.amount;
  const outstandingTotal = Math.max(0, invoice.grandTotal - nextPaidTotal);
  const nextStatus =
    outstandingTotal <= 0 ? "PAID" : nextPaidTotal > 0 ? "PARTIAL" : invoice.status;

  const updatedInvoice: Invoice = {
    ...invoice,
    updatedAt: timestamp,
    status: nextStatus,
    paidTotal: nextPaidTotal,
    outstandingTotal
  };

  await getStore().putMany([
    { collection: "payments", item: payment },
    { collection: "invoices", item: updatedInvoice }
  ]);

  return payment;
}

export async function viewInvoiceInPortal(input: { token: string; ip?: string; userAgent?: string }) {
  const portalToken = await validatePortalToken(input.token, "INVOICE");
  const invoice = await getInvoice(portalToken.entityId);
  if (!invoice) {
    throw new Error("Invoice was not found");
  }

  await touchPortalToken(portalToken, {
    ip: input.ip,
    userAgent: input.userAgent
  });

  return { invoice, portalToken };
}

async function nextInvoiceNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existing = await getStore().list<Invoice>("invoices");
  const count = existing.filter((item) => item.invoiceNumber.startsWith("INV" + today)).length + 1;
  return `INV${today}-${String(count).padStart(4, "0")}`;
}
