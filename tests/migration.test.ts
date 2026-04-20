import { describe, expect, it } from "vitest";
import { migrateLegacyData } from "@/server/services/migration";

describe("migrateLegacyData", () => {
  it("maps legacy vendor, client, and quote data into canonical records", () => {
    const result = migrateLegacyData({
      vendors: [
        {
          id: "vendor-1",
          name: "Northside Pest",
          contactEmail: "office@northside.test",
          contactPhone: "555-0100",
          createdAt: "2026-01-15T10:00:00.000Z"
        }
      ],
      clients: [
        {
          id: "client-1",
          vendorId: "vendor-1",
          name: "Lakeside Apartments",
          email: "manager@lakeside.test",
          phone: "555-0101",
          address1: "456 Lake Dr",
          city: "Austin",
          state: "TX",
          postalCode: "78701",
          createdAt: "2026-01-16T10:00:00.000Z"
        }
      ],
      quotes: [
        {
          id: "quote-1",
          vendorId: "vendor-1",
          clientId: "client-1",
          quoteNumber: "Q20260116-0001",
          subtotal: 350,
          taxTotal: 28.88,
          grandTotal: 378.88,
          payload: JSON.stringify({
            address: "456 Lake Dr",
            sqft: 1800,
            comments: "German roach treatment and follow-up.",
            outputNotes: "Legacy notes"
          }),
          createdAt: "2026-01-17T10:00:00.000Z"
        }
      ]
    });

    expect(result.organizations).toHaveLength(1);
    expect(result.customers).toHaveLength(1);
    expect(result.properties).toHaveLength(1);
    expect(result.quotes).toHaveLength(1);
    expect(result.revisions).toHaveLength(1);
    expect(result.lines.length).toBeGreaterThan(0);

    const organization = result.organizations[0];
    const customer = result.customers[0];
    const property = result.properties[0];
    const quote = result.quotes[0];
    const revision = result.revisions[0];

    if (!organization || !customer || !property || !quote || !revision) {
      throw new Error("Expected migrated records to be present");
    }

    expect(organization.name).toBe("Northside Pest");
    expect(customer.legacyClientId).toBe("client-1");
    expect(property.legacyClientId).toBe("client-1");
    expect(property.customerId).toBe(customer.id);
    expect(quote.organizationId).toBe(organization.id);
    expect(quote.customerId).toBe(customer.id);
    expect(quote.propertyId).toBe(property.id);
    expect(quote.legacyVendorId).toBe("vendor-1");
    expect(quote.legacyClientId).toBe("client-1");
    expect(revision.payload.propertyAddress).toBe("456 Lake Dr");
    expect(revision.payload.propertySquareFootage).toBe(1800);
    expect(revision.payload.notes).toBe("Legacy notes");
  });
});
