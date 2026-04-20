import Stripe from "stripe";
import { env } from "@/config/env";
import { Customer, Invoice, InvoiceLine, Subscription } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { getStripe } from "@/server/services/billing";

export async function ensureStripeInvoice(input: {
  invoice: Invoice;
  customer: Customer;
  lines: InvoiceLine[];
}) {
  const stripe = getStripe();
  if (!stripe) {
    return null;
  }

  let stripeCustomerId = input.customer.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: input.customer.email,
      name: input.customer.name
    });
    stripeCustomerId = customer.id;
    await getStore().put("customers", {
      ...input.customer,
      updatedAt: nowIso(),
      stripeCustomerId
    });
  }

  await Promise.all(
    input.lines.map((line) =>
      stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: Math.round(line.lineTotal * 100),
        currency: input.invoice.currencyCode.toLowerCase(),
        description: line.description
      })
    )
  );

  const stripeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: "send_invoice",
    days_until_due: input.invoice.dueDate ? undefined : 14,
    due_date: input.invoice.dueDate ? Math.floor(new Date(input.invoice.dueDate).getTime() / 1000) : undefined,
    metadata: {
      pestimatorInvoiceId: input.invoice.id,
      organizationId: input.invoice.organizationId
    }
  });
  if (!stripeInvoice.id) {
    throw new Error("Stripe did not return an invoice id");
  }

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  const updated = {
    ...input.invoice,
    updatedAt: nowIso(),
    stripeInvoiceId: finalized.id,
    stripeHostedInvoiceUrl: finalized.hosted_invoice_url || undefined
  };

  await getStore().put("invoices", updated);
  return updated;
}

export async function handleStripeWebhook(requestBody: string, signature: string | null) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhooks are not configured");
  }

  const event = stripe.webhooks.constructEvent(requestBody, signature ?? "", env.STRIPE_WEBHOOK_SECRET);

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const matched = await getStore().list<Invoice>("invoices", { stripeInvoiceId: invoice.id });
    const localInvoice = matched[0];
    if (localInvoice) {
      await getStore().put("invoices", {
        ...localInvoice,
        updatedAt: nowIso(),
        status: "PAID",
        paidTotal: localInvoice.grandTotal,
        outstandingTotal: 0
      });
    }
  }

  if (event.type.startsWith("customer.subscription")) {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptions = await getStore().list<Subscription>("subscriptions");
    const local = subscriptions.find((item) => item.stripeSubscriptionId === subscription.id);
    if (local) {
      await getStore().put("subscriptions", {
        ...local,
        updatedAt: nowIso(),
        status: mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.items.data[0]?.current_period_start ?? Date.now()).toISOString(),
        currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end ?? Date.now()).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });
    }
  }

  return event.type;
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): Subscription["status"] {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
