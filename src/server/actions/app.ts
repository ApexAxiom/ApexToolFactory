"use server";

import { redirect } from "next/navigation";
import { QuoteDraftPayload, RoleName } from "@/domain/types";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { createCustomer, createProperty, getCustomer } from "@/server/services/customers";
import { createOrganization } from "@/server/services/organizations";
import { createQuoteDraft, getQuote, getQuoteLines, sendQuote } from "@/server/services/quotes";
import { getInvoice, getInvoiceLines, issueInvoiceFromQuote, sendInvoice } from "@/server/services/invoices";
import { inviteTeamMember } from "@/server/services/team";
import { deliverInvoiceEmail, deliverQuoteEmail } from "@/server/services/email";
import { ensureStripeInvoice } from "@/server/services/stripe";

export async function createOrganizationAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Organization name is required");
  }

  await createOrganization({
    name,
    legalName: String(formData.get("legalName") || "").trim() || undefined,
    timezone: "America/Chicago",
    owner: session
  });

  redirect("/app/dashboard");
}

export async function createCustomerAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const customer = await createCustomer({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim() || undefined,
    phone: String(formData.get("phone") || "").trim() || undefined,
    billingAddress1: String(formData.get("billingAddress1") || "").trim() || undefined,
    billingCity: String(formData.get("billingCity") || "").trim() || undefined,
    billingState: String(formData.get("billingState") || "").trim() || undefined,
    billingPostalCode: String(formData.get("billingPostalCode") || "").trim() || undefined,
    primaryContactName: String(formData.get("primaryContactName") || "").trim() || undefined
  });

  redirect(`/app/customers/${customer.id}`);
}

export async function createPropertyAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const property = await createProperty({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    customerId: String(formData.get("customerId") || ""),
    name: String(formData.get("name") || "").trim(),
    address1: String(formData.get("address1") || "").trim(),
    city: String(formData.get("city") || "").trim() || undefined,
    state: String(formData.get("state") || "").trim() || undefined,
    postalCode: String(formData.get("postalCode") || "").trim() || undefined,
    sqft: Number(formData.get("sqft") || 0) || undefined,
    structureType: String(formData.get("structureType") || "").trim() || undefined,
    infestationNotes: String(formData.get("infestationNotes") || "").trim() || undefined
  });

  redirect(`/app/properties/${property.id}`);
}

export async function createQuoteDraftAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const customerId = String(formData.get("customerId") || "");
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error("Customer was not found");

  const payload: QuoteDraftPayload = {
    customerName: customer.name,
    propertyAddress: String(formData.get("propertyAddress") || "").trim(),
    propertySquareFootage: Number(formData.get("propertySquareFootage") || 0) || undefined,
    visitType: (String(formData.get("visitType") || "ONE_TIME") as QuoteDraftPayload["visitType"]),
    pestFindings: JSON.parse(String(formData.get("pestFindings") || "[]")),
    serviceScope: String(formData.get("serviceScope") || "").trim(),
    notes: String(formData.get("notes") || "").trim() || undefined,
    pricing: {
      baseRatePerSqft: Number(formData.get("baseRatePerSqft") || 0.06),
      laborHours: Number(formData.get("laborHours") || 1.5),
      laborRate: Number(formData.get("laborRate") || 85),
      materials: Number(formData.get("materials") || 0),
      travel: Number(formData.get("travel") || 0),
      markupPercent: Number(formData.get("markupPercent") || 15),
      taxPercent: Number(formData.get("taxPercent") || 0)
    }
  };

  const result = await createQuoteDraft({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    customer,
    propertyId: String(formData.get("propertyId") || "").trim() || undefined,
    title: String(formData.get("title") || "").trim() || `${customer.name} service quote`,
    payload
  });

  redirect(`/app/quotes/${result.quote.id}`);
}

export async function sendQuoteAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const quoteId = String(formData.get("quoteId") || "");
  const recipientEmail = String(formData.get("recipientEmail") || "").trim();
  const result = await sendQuote({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    quoteId,
    recipientEmail
  });
  await deliverQuoteEmail({
    quote: result.quote,
    revision: result.revision,
    lines: await getQuoteLines(result.quote.id, context.organization.id),
    emailMessage: result.emailMessage,
    portalUrl: `${process.env.APP_URL || "http://localhost:3000"}${String(result.emailMessage.payload?.portalUrl || "")}`,
    recipientEmail
  });

  redirect(`/app/quotes/${quoteId}`);
}

export async function issueInvoiceAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const quoteId = String(formData.get("quoteId") || "");
  const quote = await getQuote(quoteId);
  if (!quote) throw new Error("Quote was not found");

  const invoice = await issueInvoiceFromQuote({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    quote,
    quoteLines: await getQuoteLines(quoteId, context.organization.id)
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
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  const invoiceId = String(formData.get("invoiceId") || "");
  const recipientEmail = String(formData.get("recipientEmail") || "").trim();
  const result = await sendInvoice({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    invoiceId,
    recipientEmail
  });

  const [invoice, lines] = await Promise.all([
    getInvoice(invoiceId),
    getInvoiceLines(invoiceId, context.organization.id)
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
    recipientEmail
  });

  redirect(`/app/invoices/${invoiceId}`);
}

export async function inviteTeamMemberAction(formData: FormData) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) throw new Error("No active organization");

  await inviteTeamMember({
    organizationId: context.organization.id,
    actorUserId: session.userId,
    email: String(formData.get("email") || "").trim(),
    displayName: String(formData.get("displayName") || "").trim() || undefined,
    role: String(formData.get("role") || "ESTIMATOR").trim().toUpperCase() as RoleName
  });

  redirect("/app/team");
}
