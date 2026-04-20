import Stripe from "stripe";
import { env } from "@/config/env";
import { Subscription } from "@/domain/types";
import { getStore } from "@/server/persistence/store";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export async function getSubscription(organizationId: string) {
  const records = await getStore().list<Subscription>("subscriptions", { organizationId });
  return records[0] ?? null;
}
