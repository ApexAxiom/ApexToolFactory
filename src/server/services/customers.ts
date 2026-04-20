import { randomUUID } from "crypto";
import { Customer, CustomerContact, Invoice, Property, Quote } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";

export async function listCustomers(organizationId: string) {
  return getStore().list<Customer>("customers", { organizationId });
}

export async function getCustomer(customerId: string) {
  return getStore().get<Customer>("customers", customerId);
}

export async function getCustomerContacts(customerId: string, organizationId: string) {
  const contacts = await getStore().list<CustomerContact>("customerContacts", {
    organizationId,
    customerId
  });
  return contacts.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export async function getCustomerProperties(customerId: string, organizationId: string) {
  return getStore().list<Property>("properties", { organizationId, customerId });
}

export async function getCustomerFinancialSummary(customerId: string, organizationId: string) {
  const [quotes, invoices] = await Promise.all([
    getStore().list<Quote>("quotes", { organizationId, customerId }),
    getStore().list<Invoice>("invoices", { organizationId, customerId })
  ]);

  return {
    quotes,
    invoices,
    quotedTotal: quotes.reduce((sum, quote) => sum + quote.grandTotal, 0),
    invoicedTotal: invoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0),
    outstandingTotal: invoices.reduce((sum, invoice) => sum + invoice.outstandingTotal, 0)
  };
}

export async function createCustomer(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress1?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  notes?: string;
  primaryContactName?: string;
}) {
  const timestamp = nowIso();
  const customer: Customer = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    billingAddress1: input.billingAddress1,
    billingCity: input.billingCity,
    billingState: input.billingState,
    billingPostalCode: input.billingPostalCode,
    notes: input.notes
  };

  await getStore().put("customers", customer);

  if (input.primaryContactName) {
    const contact: CustomerContact = {
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: input.organizationId,
      customerId: customer.id,
      name: input.primaryContactName,
      email: input.email,
      phone: input.phone,
      isPrimary: true
    };
    await getStore().put("customerContacts", contact);
  }

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "customer.created",
    entityType: "Customer",
    entityId: customer.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ name: customer.name })
  });

  return customer;
}

export async function createProperty(input: {
  organizationId: string;
  actorUserId: string;
  customerId: string;
  name: string;
  address1: string;
  city?: string;
  state?: string;
  postalCode?: string;
  sqft?: number;
  structureType?: string;
  infestationNotes?: string;
}) {
  const timestamp = nowIso();
  const property: Property = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    customerId: input.customerId,
    name: input.name,
    address1: input.address1,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    sqft: input.sqft,
    structureType: input.structureType,
    infestationNotes: input.infestationNotes
  };

  await getStore().put("properties", property);

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "property.created",
    entityType: "Property",
    entityId: property.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ customerId: input.customerId, name: property.name })
  });

  return property;
}
