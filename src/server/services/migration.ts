import { randomUUID } from "crypto";
import {
  Customer,
  LegacyClient,
  LegacyQuote,
  LegacyVendor,
  Organization,
  Property,
  Quote,
  QuoteDraftPayload,
  QuoteLine,
  QuoteRevision
} from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { calculatePricing } from "@/domain/pricing";

export interface MigrationOutput {
  organizations: Organization[];
  customers: Customer[];
  properties: Property[];
  quotes: Quote[];
  revisions: QuoteRevision[];
  lines: QuoteLine[];
}

export function migrateLegacyData(input: {
  vendors: LegacyVendor[];
  clients: LegacyClient[];
  quotes: LegacyQuote[];
}): MigrationOutput {
  const timestamp = nowIso();
  const vendorToOrg = new Map<string, Organization>();
  const clientToCustomer = new Map<string, Customer>();
  const clientToProperty = new Map<string, Property>();

  input.vendors.forEach((vendor) => {
    vendorToOrg.set(vendor.id, {
      id: randomUUID(),
      createdAt: vendor.createdAt || timestamp,
      updatedAt: vendor.createdAt || timestamp,
      name: vendor.name,
      supportEmail: vendor.contactEmail,
      supportPhone: vendor.contactPhone,
      currencyCode: "USD",
      timezone: "America/Chicago",
      defaultTaxPercent: 0,
      defaultTerms: "Net 14"
    });
  });

  input.clients.forEach((client) => {
    const organization = vendorToOrg.get(client.vendorId);
    if (!organization) return;

    const customer: Customer = {
      id: randomUUID(),
      createdAt: client.createdAt || timestamp,
      updatedAt: client.createdAt || timestamp,
      organizationId: organization.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      billingAddress1: client.address1,
      billingCity: client.city,
      billingState: client.state,
      billingPostalCode: client.postalCode,
      legacyClientId: client.id
    };

    const property: Property = {
      id: randomUUID(),
      createdAt: client.createdAt || timestamp,
      updatedAt: client.createdAt || timestamp,
      organizationId: organization.id,
      customerId: customer.id,
      name: client.name,
      address1: client.address1 || "Unknown service address",
      city: client.city,
      state: client.state,
      postalCode: client.postalCode,
      legacyClientId: client.id
    };

    clientToCustomer.set(client.id, customer);
    clientToProperty.set(client.id, property);
  });

  const quotes: Quote[] = [];
  const revisions: QuoteRevision[] = [];
  const lines: QuoteLine[] = [];

  input.quotes.forEach((legacyQuote) => {
    const organization = vendorToOrg.get(legacyQuote.vendorId);
    const customer = clientToCustomer.get(legacyQuote.clientId);
    const property = clientToProperty.get(legacyQuote.clientId);
    if (!organization || !customer) return;

    const quoteId = randomUUID();
    const revisionId = randomUUID();
    const payload = parseLegacyPayload(customer.name, property?.address1 || "Unknown address", legacyQuote.payload);
    const pricing = calculatePricing(payload);

    const quote: Quote = {
      id: quoteId,
      createdAt: legacyQuote.createdAt || timestamp,
      updatedAt: legacyQuote.createdAt || timestamp,
      organizationId: organization.id,
      customerId: customer.id,
      propertyId: property?.id,
      quoteNumber: legacyQuote.quoteNumber,
      status: "DRAFT",
      title: `${customer.name} service quote`,
      serviceAddressSnapshot: property?.address1 || "Unknown address",
      customerNameSnapshot: customer.name,
      subtotal: legacyQuote.subtotal,
      taxTotal: legacyQuote.taxTotal,
      grandTotal: legacyQuote.grandTotal,
      currencyCode: "USD",
      currentRevisionId: revisionId,
      legacyVendorId: legacyQuote.vendorId,
      legacyClientId: legacyQuote.clientId,
      legacyPayload: legacyQuote.payload
    };

    const revision: QuoteRevision = {
      id: revisionId,
      createdAt: legacyQuote.createdAt || timestamp,
      updatedAt: legacyQuote.createdAt || timestamp,
      organizationId: organization.id,
      quoteId,
      revisionNumber: 1,
      payload,
      subtotal: legacyQuote.subtotal,
      taxTotal: legacyQuote.taxTotal,
      grandTotal: legacyQuote.grandTotal,
      revisedAt: legacyQuote.createdAt || timestamp,
      revisedBy: "legacy-migration",
      notes: "Migrated from legacy client/vendor quote schema"
    };

    quotes.push(quote);
    revisions.push(revision);
    pricing.lineItems.forEach((line, index) => {
      lines.push({
        id: randomUUID(),
        createdAt: legacyQuote.createdAt || timestamp,
        updatedAt: legacyQuote.createdAt || timestamp,
        organizationId: organization.id,
        quoteId,
        revisionId,
        lineNumber: index + 1,
        description: line.description,
        category: line.category,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        taxable: line.taxable
      });
    });
  });

  return {
    organizations: [...vendorToOrg.values()],
    customers: [...clientToCustomer.values()],
    properties: [...clientToProperty.values()],
    quotes,
    revisions,
    lines
  };
}

function parseLegacyPayload(customerName: string, address: string, rawPayload: string): QuoteDraftPayload {
  try {
    const parsed = JSON.parse(rawPayload) as Record<string, unknown>;
    return {
      customerName,
      propertyAddress: String(parsed.address || address),
      propertySquareFootage: Number(parsed.sqft || 0),
      visitType: "ONE_TIME",
      pestFindings: [],
      serviceScope: String(parsed.comments || "Migrated quote scope"),
      notes: String(parsed.outputNotes || ""),
      pricing: {
        baseRatePerSqft: Number(parsed.baseRateSqft || 0.06),
        laborHours: Number(parsed.hours || 1.5),
        laborRate: Number(parsed.laborRate || 85),
        materials: Number(parsed.materials || 0),
        travel: Number(parsed.travel || 0),
        markupPercent: Number(parsed.markupPct || 15),
        taxPercent: Number(parsed.taxPct || 0)
      }
    };
  } catch {
    return {
      customerName,
      propertyAddress: address,
      propertySquareFootage: 0,
      visitType: "ONE_TIME",
      pestFindings: [],
      serviceScope: "Migrated quote scope",
      pricing: {
        baseRatePerSqft: 0.06,
        laborHours: 1.5,
        laborRate: 85,
        materials: 0,
        travel: 0,
        markupPercent: 15,
        taxPercent: 0
      }
    };
  }
}
