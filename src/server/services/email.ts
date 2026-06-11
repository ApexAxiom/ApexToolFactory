import { randomUUID } from "crypto";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { env } from "@/config/env";
import {
  EmailEvent,
  EmailMessage,
  Invoice,
  InvoiceLine,
  Job,
  Organization,
  Quote,
  QuoteLine,
  QuoteRevision
} from "@/domain/types";
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
  organization?: Organization | null;
}) {
  const companyName = input.organization?.name ?? "Pestimator";
  const html = renderQuoteHtml(input.quote, input.revision, input.portalUrl, input.organization);
  const pdf = await renderQuotePdf(input.quote, input.revision, input.lines, input.organization);
  return sendRawEmail({
    message: {
      ...input.emailMessage,
      to: [input.recipientEmail],
      subject: `Quote ${input.quote.quoteNumber} from ${companyName}`
    },
    fromName: companyName,
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
  organization?: Organization | null;
  reminder?: boolean;
}) {
  const companyName = input.organization?.name ?? "Pestimator";
  const html = renderInvoiceHtml(input.invoice, input.portalUrl, input.organization, input.reminder ?? false);
  const csv = Buffer.from(
    ["Description,Amount", ...input.lines.map((line) => `"${line.description}",${line.lineTotal}`)].join("\n")
  );

  return sendRawEmail({
    message: {
      ...input.emailMessage,
      to: [input.recipientEmail],
      subject: input.reminder
        ? `Payment reminder: invoice ${input.invoice.invoiceNumber} from ${companyName}`
        : `Invoice ${input.invoice.invoiceNumber} from ${companyName}`
    },
    fromName: companyName,
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

export async function deliverJobConfirmationEmail(input: {
  job: Job;
  organizationName: string;
  recipientEmail: string;
  confirmUrl?: string;
}) {
  const { job } = input;
  if (!job.scheduledDate) {
    throw new Error("The job must be scheduled before sending a confirmation");
  }

  const timestamp = nowIso();
  const message: EmailMessage = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: job.organizationId,
    entityType: "JOB",
    entityId: job.id,
    to: [input.recipientEmail],
    cc: [],
    subject: `Your ${input.organizationName} service visit is confirmed for ${dateOnly(job.scheduledDate)}`,
    template: "REMINDER",
    provider: "SES",
    status: "QUEUED",
    payload: { scheduledDate: job.scheduledDate }
  };
  await getStore().put("emailMessages", message);

  const html = renderJobConfirmationHtml(job, input.organizationName, input.confirmUrl);
  return sendRawEmail({
    message,
    fromName: input.organizationName,
    html,
    text: stripHtml(html)
  });
}

export async function deliverTeamInviteEmail(input: {
  emailMessage: EmailMessage;
  organizationName: string;
  role: string;
  recipientEmail: string;
}) {
  const signupUrl = `${env.APP_URL}/signup`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">You have been invited to ${input.organizationName}</h1>
      <p>You were added as a <strong>${input.role.toLowerCase().replace(/_/g, " ")}</strong> on the ${input.organizationName} workspace.</p>
      <p>Create your account with this email address (${input.recipientEmail}) to join:</p>
      <p><a href="${signupUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">Create your account</a></p>
    </div>
  `.trim();

  return sendRawEmail({
    message: input.emailMessage,
    fromName: input.organizationName,
    html,
    text: stripHtml(html)
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
  fromName?: string;
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
    `From: ${input.fromName ?? env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
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

  const updatedMessage: EmailMessage = {
    ...emailMessage,
    updatedAt: timestamp,
    status: nextStatus
  };

  await getStore().putMany([
    { collection: "emailEvents", item: emailEvent },
    { collection: "emailMessages", item: updatedMessage }
  ]);

  return emailEvent;
}

function emailSignature(organization?: Organization | null) {
  if (!organization) return "";
  const contact = [organization.supportPhone, organization.supportEmail, organization.website]
    .filter(Boolean)
    .join(" | ");
  return `
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e6e4" />
      <p style="color:#6b7470;font-size:13px;margin:0">
        ${organization.legalName ?? organization.name}
        ${organization.licenseNumber ? `<br/>License #${organization.licenseNumber}` : ""}
        ${contact ? `<br/>${contact}` : ""}
      </p>
  `;
}

function renderQuoteHtml(quote: Quote, revision: QuoteRevision, portalUrl: string, organization?: Organization | null) {
  const companyName = organization?.name ?? "Pestimator";
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">Your pest control quote from ${companyName} is ready</h1>
      <p>Quote <strong>${quote.quoteNumber}</strong> totals <strong>${currency(quote.grandTotal)}</strong>.</p>
      <p>${revision.payload.serviceScope}</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">Review and approve quote</a></p>
      <p>This quote expires on ${dateOnly(quote.expiresAt)}.</p>
      ${emailSignature(organization)}
    </div>
  `.trim();
}

function renderInvoiceHtml(invoice: Invoice, portalUrl: string, organization?: Organization | null, reminder = false) {
  const companyName = organization?.name ?? "Pestimator";
  const heading = reminder
    ? `A friendly payment reminder from ${companyName}`
    : `Your invoice from ${companyName} is ready`;
  const balanceLine = reminder
    ? `<p>Invoice <strong>${invoice.invoiceNumber}</strong> has an outstanding balance of <strong>${currency(invoice.outstandingTotal)}</strong> and was due ${dateOnly(invoice.dueDate)}.</p>`
    : `<p>Invoice <strong>${invoice.invoiceNumber}</strong> totals <strong>${currency(invoice.grandTotal)}</strong>.</p>
      <p>Due date: ${dateOnly(invoice.dueDate)}</p>`;
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">${heading}</h1>
      ${balanceLine}
      <p><a href="${portalUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">View invoice and pay online</a></p>
      ${reminder ? "<p>If you have already sent payment, please disregard this note - and thank you!</p>" : ""}
      ${emailSignature(organization)}
    </div>
  `.trim();
}

function renderJobConfirmationHtml(job: Job, organizationName: string, confirmUrl?: string) {
  const window =
    job.scheduledStartTime && job.scheduledEndTime
      ? `between ${job.scheduledStartTime} and ${job.scheduledEndTime}`
      : job.scheduledStartTime
        ? `starting around ${job.scheduledStartTime}`
        : "during business hours";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17201d">
      <h1 style="margin-bottom:8px">Your service visit is scheduled</h1>
      <p><strong>${organizationName}</strong> will visit on <strong>${dateOnly(job.scheduledDate)}</strong> ${window}.</p>
      <p>Service address: ${job.serviceAddress}</p>
      ${job.assignedToName ? `<p>Your technician: ${job.assignedToName}</p>` : ""}
      <p>Service: ${job.title}</p>
      ${
        confirmUrl
          ? `<p style="margin-top:20px"><a href="${confirmUrl}" style="display:inline-block;padding:12px 16px;background:#173127;color:#fff;text-decoration:none;border-radius:999px">Confirm this appointment</a></p>
             <p style="color:#6b7470;font-size:13px">Need a different time? The same link lets you request a change.</p>`
          : `<p>If you need to reschedule, just reply to this email.</p>`
      }
    </div>
  `.trim();
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
