"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { QuoteDraftPayload } from "@/domain/types";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { Permission, assertPermission } from "@/server/auth/permissions";
import {
  jsonField,
  optionalEmail,
  optionalTrimmed,
  parseForm,
  requiredEmail,
  requiredTrimmed
} from "@/server/actions/validation";
import { createCustomer, createProperty, getCustomer, updateCustomer } from "@/server/services/customers";
import { createOrganization, updateOrganization } from "@/server/services/organizations";
import { createQuoteDraft, getQuote, getQuoteLines, sendQuote } from "@/server/services/quotes";
import {
  getInvoice,
  getInvoiceLines,
  issueInvoiceFromQuote,
  recordPayment,
  sendInvoice
} from "@/server/services/invoices";
import { cancelJob, completeJob, createJob, getJob, scheduleJob, startJob } from "@/server/services/jobs";
import { inviteTeamMember } from "@/server/services/team";
import { deliverInvoiceEmail, deliverJobConfirmationEmail, deliverQuoteEmail } from "@/server/services/email";
import { ensureStripeInvoice } from "@/server/services/stripe";

async function requireContext(permission?: Permission) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");
  if (permission) assertPermission(context.membership, permission);
  return { session, context };
}

export async function createOrganizationAction(formData: FormData) {
  const session = await requireSession();
  const data = parseForm(
    z.object({
      name: requiredTrimmed("Organization name"),
      legalName: optionalTrimmed
    }),
    formData
  );

  await createOrganization({
    name: data.name,
    legalName: data.legalName,
    timezone: "America/Chicago",
    owner: session
  });

  redirect("/app/dashboard");
}

export async function updateOrganizationAction(formData: FormData) {
  const { session, context } = await requireContext("settings:manage");
  const data = parseForm(
    z.object({
      name: requiredTrimmed("Organization name"),
      legalName: optionalTrimmed,
      timezone: requiredTrimmed("Timezone"),
      currencyCode: requiredTrimmed("Currency").transform((value) => value.toUpperCase()),
      defaultTaxPercent: z.coerce.number().min(0).max(100),
      defaultTerms: requiredTrimmed("Payment terms"),
      supportEmail: optionalEmail,
      supportPhone: optionalTrimmed,
      website: optionalTrimmed
    }),
    formData
  );

  await updateOrganization({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    ...data
  });

  redirect("/app/settings");
}

const customerFields = {
  name: requiredTrimmed("Customer name"),
  email: optionalEmail,
  phone: optionalTrimmed,
  billingAddress1: optionalTrimmed,
  billingCity: optionalTrimmed,
  billingState: optionalTrimmed,
  billingPostalCode: optionalTrimmed,
  notes: optionalTrimmed
};

export async function createCustomerAction(formData: FormData) {
  const { session, context } = await requireContext("customers:write");
  const data = parseForm(
    z.object({ ...customerFields, primaryContactName: optionalTrimmed }),
    formData
  );

  const customer = await createCustomer({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    ...data
  });

  redirect(`/app/customers/${customer.id}`);
}

export async function updateCustomerAction(formData: FormData) {
  const { session, context } = await requireContext("customers:write");
  const data = parseForm(
    z.object({ ...customerFields, customerId: requiredTrimmed("Customer") }),
    formData
  );

  await updateCustomer({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    ...data
  });

  redirect(`/app/customers/${data.customerId}`);
}

export async function createPropertyAction(formData: FormData) {
  const { session, context } = await requireContext("customers:write");
  const data = parseForm(
    z.object({
      customerId: requiredTrimmed("Customer"),
      name: requiredTrimmed("Property name"),
      address1: requiredTrimmed("Address"),
      city: optionalTrimmed,
      state: optionalTrimmed,
      postalCode: optionalTrimmed,
      sqft: z.coerce.number().min(0).optional(),
      structureType: optionalTrimmed,
      infestationNotes: optionalTrimmed
    }),
    formData
  );

  const property = await createProperty({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    ...data,
    sqft: data.sqft || undefined
  });

  redirect(`/app/properties/${property.id}`);
}

const pestFindingSchema = z.object({
  code: z.string(),
  label: z.string(),
  amount: z.number()
});

const lineItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().optional(),
  interval: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY"]).optional(),
  qty: z.number().min(0),
  unitPrice: z.number(),
  lineTotal: z.number(),
  taxable: z.boolean().optional()
});

export async function createQuoteDraftAction(formData: FormData) {
  const { session, context } = await requireContext("quotes:write");
  const data = parseForm(
    z.object({
      customerId: requiredTrimmed("Customer"),
      propertyId: optionalTrimmed,
      title: optionalTrimmed,
      propertyAddress: requiredTrimmed("Property address"),
      propertySquareFootage: z.coerce.number().min(0).default(0),
      visitType: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY"]).default("ONE_TIME"),
      firstServiceDate: optionalTrimmed.pipe(
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional()
      ),
      pestFindings: jsonField(z.array(pestFindingSchema)),
      lineItems: jsonField(z.array(lineItemSchema)).optional(),
      serviceScope: requiredTrimmed("Service scope"),
      notes: optionalTrimmed,
      baseRatePerSqft: z.coerce.number().min(0).default(0.06),
      laborHours: z.coerce.number().min(0).default(0),
      laborRate: z.coerce.number().min(0).default(85),
      materials: z.coerce.number().min(0).default(0),
      travel: z.coerce.number().min(0).default(0),
      markupPercent: z.coerce.number().min(0).max(500).default(0),
      taxPercent: z.coerce.number().min(0).max(100).default(0)
    }),
    formData
  );

  const customer = await getCustomer(data.customerId);
  if (!customer || customer.organizationId !== context.organization.id) {
    throw new Error("Customer was not found");
  }

  const payload: QuoteDraftPayload = {
    customerName: customer.name,
    propertyAddress: data.propertyAddress,
    propertySquareFootage: data.propertySquareFootage || undefined,
    visitType: data.visitType,
    firstServiceDate: data.firstServiceDate,
    pestFindings: data.pestFindings,
    lineItems: data.lineItems?.length ? data.lineItems : undefined,
    serviceScope: data.serviceScope,
    notes: data.notes,
    pricing: {
      baseRatePerSqft: data.baseRatePerSqft,
      laborHours: data.laborHours,
      laborRate: data.laborRate,
      materials: data.materials,
      travel: data.travel,
      markupPercent: data.markupPercent,
      taxPercent: data.taxPercent
    }
  };

  const result = await createQuoteDraft({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    customer,
    propertyId: data.propertyId,
    title: data.title || `${customer.name} service quote`,
    payload
  });

  redirect(`/app/quotes/${result.quote.id}`);
}

export async function sendQuoteAction(formData: FormData) {
  const { session, context } = await requireContext("quotes:send");
  const data = parseForm(
    z.object({
      quoteId: requiredTrimmed("Quote"),
      recipientEmail: requiredEmail("Recipient email")
    }),
    formData
  );

  const result = await sendQuote({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    quoteId: data.quoteId,
    recipientEmail: data.recipientEmail
  });
  await deliverQuoteEmail({
    quote: result.quote,
    revision: result.revision,
    lines: await getQuoteLines(result.quote.id, context.organization.id),
    emailMessage: result.emailMessage,
    portalUrl: `${process.env.APP_URL || "http://localhost:3000"}${String(result.emailMessage.payload?.portalUrl || "")}`,
    recipientEmail: data.recipientEmail
  });

  redirect(`/app/quotes/${data.quoteId}`);
}

export async function issueInvoiceAction(formData: FormData) {
  const { session, context } = await requireContext("invoices:write");
  const data = parseForm(z.object({ quoteId: requiredTrimmed("Quote") }), formData);

  const quote = await getQuote(data.quoteId);
  if (!quote || quote.organizationId !== context.organization.id) {
    throw new Error("Quote was not found");
  }

  const invoice = await issueInvoiceFromQuote({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    quote,
    quoteLines: await getQuoteLines(data.quoteId, context.organization.id)
  });
  const customer = await getCustomer(quote.customerId);
  if (customer) {
    await ensureStripeInvoice({
      invoice: invoice.invoice,
      customer,
      lines: invoice.lines
    });
  }

  redirect(`/app/invoices/${invoice.invoice.id}`);
}

export async function sendInvoiceAction(formData: FormData) {
  const { session, context } = await requireContext("invoices:write");
  const data = parseForm(
    z.object({
      invoiceId: requiredTrimmed("Invoice"),
      recipientEmail: requiredEmail("Recipient email")
    }),
    formData
  );

  const result = await sendInvoice({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    invoiceId: data.invoiceId,
    recipientEmail: data.recipientEmail
  });

  const [invoice, lines] = await Promise.all([
    getInvoice(data.invoiceId),
    getInvoiceLines(data.invoiceId, context.organization.id)
  ]);
  if (!invoice) throw new Error("Invoice was not found");

  const customer = await getCustomer(invoice.customerId);
  const invoiceForDelivery =
    customer
      ? (await ensureStripeInvoice({
          invoice,
          customer,
          lines
        })) || invoice
      : invoice;

  await deliverInvoiceEmail({
    invoice: invoiceForDelivery,
    lines,
    emailMessage: result.emailMessage,
    portalUrl: `${process.env.APP_URL || "http://localhost:3000"}${String(result.emailMessage.payload?.portalUrl || "")}`,
    recipientEmail: data.recipientEmail
  });

  redirect(`/app/invoices/${data.invoiceId}`);
}

export async function recordManualPaymentAction(formData: FormData) {
  const { context } = await requireContext("payments:record");
  const data = parseForm(
    z.object({
      invoiceId: requiredTrimmed("Invoice"),
      amount: z.coerce.number().positive("Payment amount must be greater than zero"),
      method: z.enum(["cash", "check", "card", "ach", "other"]).default("check"),
      reference: optionalTrimmed
    }),
    formData
  );

  const invoice = await getInvoice(data.invoiceId);
  if (!invoice || invoice.organizationId !== context.organization.id) {
    throw new Error("Invoice was not found");
  }
  if (data.amount > invoice.outstandingTotal) {
    throw new Error("Payment amount exceeds the outstanding balance");
  }

  await recordPayment({
    organizationId: context.organization.id,
    invoiceId: data.invoiceId,
    amount: data.amount,
    method: data.method,
    provider: "MANUAL",
    reference: data.reference
  });

  redirect(`/app/invoices/${data.invoiceId}`);
}

export async function inviteTeamMemberAction(formData: FormData) {
  const { session, context } = await requireContext("team:manage");
  const data = parseForm(
    z.object({
      email: requiredEmail("Email"),
      displayName: optionalTrimmed,
      role: z.enum(["OWNER", "OFFICE_MANAGER", "ESTIMATOR", "TECHNICIAN", "ACCOUNTING"]).default("ESTIMATOR")
    }),
    formData
  );

  await inviteTeamMember({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    email: data.email,
    displayName: data.displayName,
    role: data.role
  });

  redirect("/app/team");
}

const scheduleFields = {
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  scheduledStartTime: optionalTrimmed.pipe(
    z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time").optional()
  ),
  scheduledEndTime: optionalTrimmed.pipe(
    z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time").optional()
  ),
  assignedMembershipId: optionalTrimmed,
  assignedToName: optionalTrimmed
};

export async function createJobAction(formData: FormData) {
  const { session, context } = await requireContext("jobs:write");
  const data = parseForm(
    z.object({
      customerId: requiredTrimmed("Customer"),
      propertyId: optionalTrimmed,
      title: requiredTrimmed("Job title"),
      serviceAddress: optionalTrimmed,
      notes: optionalTrimmed,
      ...scheduleFields,
      scheduledDate: optionalTrimmed.pipe(
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").optional()
      )
    }),
    formData
  );

  const customer = await getCustomer(data.customerId);
  if (!customer || customer.organizationId !== context.organization.id) {
    throw new Error("Customer was not found");
  }

  const job = await createJob({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    customerId: customer.id,
    customerName: customer.name,
    propertyId: data.propertyId,
    title: data.title,
    serviceAddress: data.serviceAddress || customer.billingAddress1 || "Service address on file",
    scheduledDate: data.scheduledDate,
    scheduledStartTime: data.scheduledStartTime,
    scheduledEndTime: data.scheduledEndTime,
    assignedMembershipId: data.assignedMembershipId,
    assignedToName: data.assignedToName,
    notes: data.notes
  });

  redirect(`/app/jobs/${job.id}`);
}

export async function scheduleJobAction(formData: FormData) {
  const { session, context } = await requireContext("jobs:write");
  const data = parseForm(
    z.object({ jobId: requiredTrimmed("Job"), ...scheduleFields }),
    formData
  );

  await scheduleJob({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    ...data
  });

  redirect(`/app/jobs/${data.jobId}`);
}

export async function startJobAction(formData: FormData) {
  const { session, context } = await requireContext("jobs:update-status");
  const data = parseForm(z.object({ jobId: requiredTrimmed("Job") }), formData);

  await startJob({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    jobId: data.jobId
  });

  redirect(`/app/jobs/${data.jobId}`);
}

export async function completeJobAction(formData: FormData) {
  const { session, context } = await requireContext("jobs:update-status");
  const data = parseForm(
    z.object({
      jobId: requiredTrimmed("Job"),
      completionNotes: optionalTrimmed,
      materialsUsed: optionalTrimmed
    }),
    formData
  );

  await completeJob({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    jobId: data.jobId,
    completionNotes: data.completionNotes,
    materialsUsed: data.materialsUsed
  });

  redirect(`/app/jobs/${data.jobId}`);
}

export async function sendJobConfirmationAction(formData: FormData) {
  const { context } = await requireContext("jobs:write");
  const data = parseForm(
    z.object({
      jobId: requiredTrimmed("Job"),
      recipientEmail: requiredEmail("Recipient email")
    }),
    formData
  );

  const job = await getJob(data.jobId);
  if (!job || job.organizationId !== context.organization.id) {
    throw new Error("Job was not found");
  }

  await deliverJobConfirmationEmail({
    job,
    organizationName: context.organization.name,
    recipientEmail: data.recipientEmail
  });

  redirect(`/app/jobs/${data.jobId}`);
}

export async function cancelJobAction(formData: FormData) {
  const { session, context } = await requireContext("jobs:write");
  const data = parseForm(z.object({ jobId: requiredTrimmed("Job") }), formData);

  const job = await getJob(data.jobId);
  if (!job || job.organizationId !== context.organization.id) {
    throw new Error("Job was not found");
  }

  await cancelJob({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    jobId: data.jobId
  });

  redirect("/app/schedule");
}
