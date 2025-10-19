export type OrgId = string;

export interface Customer {
  id: string; orgId: OrgId; name: string; email?: string; phone?: string;
  createdAt: string;
}
export interface Property {
  id: string; orgId: OrgId; customerId: string; address1: string; city?: string; state?: string; zip?: string;
  sqft?: number; lotSize?: number; createdAt: string;
}
export interface ServiceTemplate {
  id: string; orgId: OrgId; code: string; name: string; basePrice: number; unit?: "visit"|"sqft"|"linear-ft";
  createdAt: string;
}
export interface QuoteItem { templateId: string; qty: number; unitPrice: number; lineTotal: number; }
export interface Quote {
  id: string; orgId: OrgId; number: string; customerId: string; propertyId: string;
  items: QuoteItem[]; subtotal: number; tax: number; total: number;
  createdAt: string;
}
export interface Meta {
  nextDailySerial: number;
  serialDate: string; // YYYYMMDD
}
export interface IndexRow {
  id: string; number: string; customerName: string; createdAt: string; total: number;
}
