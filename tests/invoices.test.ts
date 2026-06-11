import { describe, expect, it } from "vitest";
import { Invoice } from "@/domain/types";
import { effectiveInvoiceStatus } from "@/server/services/invoices";

function invoice(overrides: Partial<Invoice>): Invoice {
  const timestamp = "2026-06-01T00:00:00.000Z";
  return {
    id: "invoice-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: "org-1",
    customerId: "customer-1",
    invoiceNumber: "INV-1",
    status: "ISSUED",
    issueDate: timestamp,
    dueDate: "2026-06-15T00:00:00.000Z",
    subtotal: 100,
    taxTotal: 8,
    grandTotal: 108,
    paidTotal: 0,
    outstandingTotal: 108,
    currencyCode: "USD",
    ...overrides
  };
}

describe("effectiveInvoiceStatus", () => {
  const afterDue = new Date("2026-06-20T00:00:00.000Z");
  const beforeDue = new Date("2026-06-10T00:00:00.000Z");

  it("marks issued invoices overdue once the due date passes", () => {
    expect(effectiveInvoiceStatus(invoice({}), afterDue)).toBe("OVERDUE");
    expect(effectiveInvoiceStatus(invoice({}), beforeDue)).toBe("ISSUED");
  });

  it("marks partially paid invoices overdue too", () => {
    const partial = invoice({ status: "PARTIAL", paidTotal: 50, outstandingTotal: 58 });
    expect(effectiveInvoiceStatus(partial, afterDue)).toBe("OVERDUE");
  });

  it("never marks paid or void invoices overdue", () => {
    expect(effectiveInvoiceStatus(invoice({ status: "PAID", paidTotal: 108, outstandingTotal: 0 }), afterDue)).toBe("PAID");
    expect(effectiveInvoiceStatus(invoice({ status: "VOID" }), afterDue)).toBe("VOID");
  });

  it("leaves invoices without a due date alone", () => {
    expect(effectiveInvoiceStatus(invoice({ dueDate: undefined }), afterDue)).toBe("ISSUED");
  });
});
