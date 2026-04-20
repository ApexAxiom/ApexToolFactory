import { randomUUID } from "crypto";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { env } from "@/config/env";
import { EmailEvent, EmailMessage, Invoice, InvoiceLine, Quote, QuoteLine, QuoteRevision } from "@/domain/types";
import { getStore } from "@/server/persistence/store";
import { renderQuotePdf } from "@/server/services/quotes";
import { writeAuditEvent } from "@/server/services/audit";
import { nowIso, currency, dateOnly } from "@/lib/utils";

let sesClient: SESv2Client | null = null;

function getSesClient() {
  if (!sesClient) {
    sesClient = new SESv2Client({ region: env.AWS_REGION });
  }
  return sesClient;
}

export async function deliverQuoteEmail(input: {
  quote: Quote;
  revision: QuoteRevision;
  lines: QuoteLine[];
  emailMessage: EmailMessage;
  portalUrl: string;
  recipientEmail: string;
}) {
  const html = renderQuoteHtml(input.quote, input.revision, input.portalUrl);
  const pdf = await renderQuotePdf(input.quote, input.revision, input.lines);
  return sendRawEmail({
    message: {
      ...input.emailMessage,
      to: [input.recipientEmail],
      subject: `Quote ${input.quote.quoteNumber} from Pestimator`
    },
    html,
    text: stripHtml(html),
    attachments: [
      {
        fileName: `${input.quote.quoteNumber}.pdf`,
        contentType: "application/pdf",
        content: pdf
      }
    ]
  });
}

export async function deliverInvoiceEmail(input: {
  invoice: Invoice;
  lines: InvoiceLine[];
  emailMessage: EmailMessage;
  portalUrl: string;
  recipientEmail: string;
}) {
  const html = renderInvoiceHtml(input.invoice, input.portalUrl);
  const csv = Buffer.from(
    ["Description,Amount", ...input.lines.map((line) => `"${line.description}",${line.lineTotal}`)].join("\n")
  );

  return sendRawEmail({
    message: {
      ...input.emailMessage,
      to: [input.recipientEmail],
      subject: `Invoice ${input.invoice.invoiceNumber} from Pestimator`
    },
    html,
    text: stripHtml(html),
    attachments: [
      {
        fileName: `${input.invoice.invoiceNumber}.csv`,
        contentType: "text/csv",
        content: csv
      }
    ]
  });
}

interface RawAttachment {
  fileName: string;
  contentType: string;
  content: Buffer;
}

async function sendRawEmail(input: {
  message: EmailMessage;
  html: string;
  text: string;
  attachments?: RawAttachment[];
}) {
  const { message } = input;

  if (!env.SES_FROM_EMAIL) {
    await getStore().put("emailMessages", {
      ...message,
      updatedAt: nowIso(),
      status: "FAILED"
    });

    return { message, delivered: false, reason: "SES_FROM_EMAIL is not configured" };
  }

  const boundary = `PestimatorBoundary${randomUUID()}`;
  const parts = [
    `From: ${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    `To: ${message.to.join(", ")}`,
    `Subject: ${message.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: multipart/alternative; boundary="alt-boundary"',
    "",
    "--alt-boundary",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.text,
    "",
    "--alt-boundary",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.html,
    "",
    "--alt-boundary--"
  ];

  (input.attachments || []).forEach((attachment) => {
    parts.push(
      "",
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.fileName}"`,
      `Content-Disposition: attachment; filename="${attachment.fileName}"`,
      "Content-Transfer-Encoding: base64",
      "",
      attachment.content.toString("base64").replace(/(.{76})/g, "$1\r\n")
    );
  });

  parts.push("", `--${boundary}--`);
  const raw = Buffer.from(parts.join("\r\n"));

  const response = await getSesClient().send(
    new SendEmailCommand({
      FromEmailAddress: env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: message.to
      },
      Content: {
        Raw: {
          Data: raw
        }
      }
    })
  );

  const delivered = {
    ...message,
    updatedAt: nowIso(),
    status: "SENT" as const,
    providerMessageId: response.MessageId,
    sentAt: nowIso()
  };

  await getStore().put("emailMessages", delivered);
  await writeAuditEvent({
    organizationId: message.organizationId,
    action: "email.sent",
    entityType: "EmailMessage",
    entityId: message.id,
    occurredAt: nowIso(),
    payload: JSON.stringify({ providerMessageId: response.MessageId })
  });

  return { message: delivered, delivered: true };
}

export async function ingestSesEvent(rawPayload: string) {
  const timestamp = nowIso();
  const body = JSON.parse(rawPayload) as Record<string, unknown>;
  const normalized = body.Message ? JSON.parse(String(body.Message)) : body;
  const mail = normalized.mail as { messageId?: string } | undefined;
  const messageId = mail?.messageId;

  if (!messageId) {
    throw new Error("SES webhook payload did not include a mail.messageId");
  }

  const matches = await getStore().list<EmailMessage>("emailMessages", { providerMessageId: messageId });
  const emailMessage = matches[0];
  if (!emailMessage) {
    throw new Error("Email message could not be matched to providerMessageId");
  }

  const eventType = normalized.eventType || normalized.notificationType || "DELIVERY";
  const emailEvent: EmailEvent = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: emailMessage.organizationId,
    emailMessageId: emailMessage.id,
    eventType: eventType === "Bounce" ? "BOUNCE" : eventType === "Complaint" ? "COMPLAINT" : "DELIVERY",
    occurredAt: timestamp,
    rawPayload
  };

  const nextStatus =
    emailEvent.eventType === "BOUNCE"
      ? "BOUNCED"
      : emailEvent.eventType === "COMPLAINT"
        ? "COMPLAINED"
        : "DELIVERED";

  await Promise.all([
    getStore().put("emailEvents", emailEvent),
    getStore().put("emailMessages", {
      ...emailMessage,
      updatedAt: timestamp,
      status: nextStatus
    })
  ]);

  return emailEvent;
}

function renderQuoteHtml(quote: Quote, revision: QuoteRevision, portalUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">Your pest control quote is ready</h1>
      <p>Quote <strong>${quote.quoteNumber}</strong> totals <strong>${currency(quote.grandTotal)}</strong>.</p>
      <p>${revision.payload.serviceScope}</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">Review and approve quote</a></p>
      <p>This quote expires on ${dateOnly(quote.expiresAt)}.</p>
    </div>
  `.trim();
}

function renderInvoiceHtml(invoice: Invoice, portalUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">Your invoice is ready</h1>
      <p>Invoice <strong>${invoice.invoiceNumber}</strong> totals <strong>${currency(invoice.grandTotal)}</strong>.</p>
      <p>Due date: ${dateOnly(invoice.dueDate)}</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">View invoice and pay online</a></p>
    </div>
  `.trim();
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
