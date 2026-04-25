export type RoleName = "OWNER" | "OFFICE_MANAGER" | "ESTIMATOR" | "TECHNICIAN" | "ACCOUNTING";

export type MembershipStatus = "INVITED" | "ACTIVE" | "DISABLED";
export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "VOID";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE";
export type PortalEntityType = "QUOTE" | "INVOICE";
export type EmailTemplate = "QUOTE_SENT" | "INVOICE_SENT" | "TEAM_INVITE" | "REMINDER";
export type EmailStatus = "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED";
export type EmailEventType = "DELIVERY" | "BOUNCE" | "COMPLAINT" | "RENDERED" | "FAILED";

export interface EntityBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization extends EntityBase {
  name: string;
  legalName?: string;
  timezone: string;
  currencyCode: string;
  defaultTaxPercent: number;
  defaultTerms: string;
  supportEmail?: string;
  supportPhone?: string;
  website?: string;
  stripeCustomerId?: string;
}

export interface Branch extends EntityBase {
  organizationId: string;
  name: string;
  code: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isActive: boolean;
}

export interface OrganizationMembership extends EntityBase {
  organizationId: string;
  userId?: string;
  email: string;
  displayName?: string;
  role: RoleName;
  status: MembershipStatus;
  branchIds: string[];
  invitedAt?: string;
  acceptedAt?: string;
}

export interface Customer extends EntityBase {
  organizationId: string;
  accountNumber?: string;
  name: string;
  email?: string;
  phone?: string;
  billingAddress1?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  notes?: string;
  legacyClientId?: string;
  stripeCustomerId?: string;
}

export interface CustomerContact extends EntityBase {
  organizationId: string;
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
}

export interface Property extends EntityBase {
  organizationId: string;
  customerId: string;
  name: string;
  address1: string;
  city?: string;
  state?: string;
  postalCode?: string;
  sqft?: number;
  structureType?: string;
  infestationNotes?: string;
  legacyClientId?: string;
}

export interface ServiceTemplate extends EntityBase {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface RateCard extends EntityBase {
  organizationId: string;
  name: string;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface RateRule extends EntityBase {
  organizationId: string;
  rateCardId: string;
  code: string;
  description: string;
  value: number;
  minimumCharge?: number;
  maximumCharge?: number;
}

export interface QuoteLine extends EntityBase {
  organizationId: string;
  quoteId: string;
  revisionId: string;
  lineNumber: number;
  description: string;
  category?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  taxable: boolean;
}

export interface QuoteAttachment extends EntityBase {
  organizationId: string;
  quoteId: string;
  revisionId?: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  capturedAt: string;
  capturedBy?: string;
}

export interface QuoteDraftPayload {
  customerName: string;
  propertyAddress: string;
  propertySquareFootage?: number;
  visitType: "ONE_TIME" | "MONTHLY" | "QUARTERLY";
  servicePlanName?: string;
  billingCadence?: "ONE_TIME" | "MONTHLY" | "QUARTERLY";
  firstServiceDate?: string;
  pestFindings: Array<{
    code: string;
    label: string;
    amount: number;
  }>;
  lineItems?: QuoteDraftLineInput[];
  serviceScope: string;
  notes?: string;
  proposalNotes?: string;
  attachments?: Array<{
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>;
  pricing: {
    baseRatePerSqft: number;
    laborHours: number;
    laborRate: number;
    materials: number;
    travel: number;
    markupPercent: number;
    taxPercent: number;
  };
}

export interface QuoteDraftLineInput {
  description: string;
  category?: string;
  interval?: "ONE_TIME" | "MONTHLY" | "QUARTERLY";
  qty: number;
  unitPrice: number;
  lineTotal: number;
  taxable?: boolean;
}

export interface QuoteRevision extends EntityBase {
  organizationId: string;
  quoteId: string;
  revisionNumber: number;
  payload: QuoteDraftPayload;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  revisedAt: string;
  revisedBy: string;
  notes?: string;
}

export interface Quote extends EntityBase {
  organizationId: string;
  customerId: string;
  propertyId?: string;
  quoteNumber: string;
  status: QuoteStatus;
  title: string;
  serviceAddressSnapshot: string;
  customerNameSnapshot: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  currencyCode: string;
  currentRevisionId: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  expiresAt?: string;
  voidedAt?: string;
  legacyVendorId?: string;
  legacyClientId?: string;
  legacyPayload?: string;
}

export interface QuoteAcceptance extends EntityBase {
  organizationId: string;
  quoteId: string;
  acceptedByName: string;
  acceptedByEmail?: string;
  acceptedAt: string;
  acceptedIp: string;
  acceptedUserAgent?: string;
  notes?: string;
}

export interface InvoiceLine extends EntityBase {
  organizationId: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  taxable: boolean;
}

export interface Invoice extends EntityBase {
  organizationId: string;
  customerId: string;
  propertyId?: string;
  quoteId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  outstandingTotal: number;
  currencyCode: string;
  stripeInvoiceId?: string;
  stripeHostedInvoiceUrl?: string;
}

export interface Payment extends EntityBase {
  organizationId: string;
  invoiceId: string;
  amount: number;
  currencyCode: string;
  paymentDate: string;
  method: string;
  status: PaymentStatus;
  reference?: string;
  provider: "STRIPE" | "MANUAL";
}

export interface EmailMessage extends EntityBase {
  organizationId: string;
  entityType: PortalEntityType | "TEAM_INVITE";
  entityId: string;
  to: string[];
  cc: string[];
  subject: string;
  template: EmailTemplate;
  provider: "SES";
  providerMessageId?: string;
  status: EmailStatus;
  sentAt?: string;
  payload?: Record<string, unknown>;
}

export interface EmailEvent extends EntityBase {
  organizationId: string;
  emailMessageId: string;
  eventType: EmailEventType;
  occurredAt: string;
  rawPayload: string;
}

export interface PortalAccessToken extends EntityBase {
  organizationId: string;
  entityType: PortalEntityType;
  entityId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  lastViewedAt?: string;
  lastViewedIp?: string;
  lastViewedUserAgent?: string;
}

export interface Subscription extends EntityBase {
  organizationId: string;
  provider: "STRIPE";
  plan: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface AuditEvent extends EntityBase {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: string;
  occurredAt: string;
}

export interface LegacyVendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt?: string;
}

export interface LegacyClient {
  id: string;
  vendorId: string;
  name: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  createdAt?: string;
}

export interface LegacyQuote {
  id: string;
  vendorId: string;
  clientId: string;
  clientName?: string;
  quoteNumber: string;
  payload: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status?: string;
  createdAt?: string;
}

export type PestimatorRecord =
  | AuditEvent
  | Branch
  | Customer
  | CustomerContact
  | EmailEvent
  | EmailMessage
  | Invoice
  | InvoiceLine
  | Organization
  | OrganizationMembership
  | Payment
  | PortalAccessToken
  | Property
  | Quote
  | QuoteAcceptance
  | QuoteAttachment
  | QuoteLine
  | QuoteRevision
  | RateCard
  | RateRule
  | ServiceTemplate
  | Subscription;
