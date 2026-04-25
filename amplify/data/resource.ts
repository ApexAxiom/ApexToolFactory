import { a, defineData } from "@aws-amplify/backend";

const TEAM_GROUPS = ["OWNER", "OFFICE_MANAGER", "ESTIMATOR", "TECHNICIAN", "ACCOUNTING"];
const internalAuth = (allow: any) => [allow.groups(TEAM_GROUPS)];

export const data = defineData({
  schema: a
    .schema({
      RoleName: a.enum(["OWNER", "OFFICE_MANAGER", "ESTIMATOR", "TECHNICIAN", "ACCOUNTING"]),
      MembershipStatus: a.enum(["INVITED", "ACTIVE", "DISABLED"]),
      QuoteStatus: a.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "VOID"]),
      InvoiceStatus: a.enum(["DRAFT", "ISSUED", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
      PaymentStatus: a.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]),
      SubscriptionStatus: a.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "INCOMPLETE"]),
      PortalEntityType: a.enum(["QUOTE", "INVOICE"]),
      EmailTemplate: a.enum(["QUOTE_SENT", "INVOICE_SENT", "TEAM_INVITE", "REMINDER"]),
      EmailStatus: a.enum(["QUEUED", "SENT", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED"]),
      EmailEventType: a.enum(["DELIVERY", "BOUNCE", "COMPLAINT", "RENDERED", "FAILED"]),

      Organization: a
        .model({
          id: a.id().required(),
          name: a.string().required(),
          legalName: a.string(),
          timezone: a.string().required(),
          currencyCode: a.string().required(),
          defaultTaxPercent: a.float().required(),
          defaultTerms: a.string().required(),
          supportEmail: a.email(),
          supportPhone: a.phone(),
          website: a.url(),
          stripeCustomerId: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Branch: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          name: a.string().required(),
          code: a.string().required(),
          phone: a.phone(),
          address1: a.string(),
          city: a.string(),
          state: a.string(),
          postalCode: a.string(),
          isActive: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      OrganizationMembership: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          userId: a.string(),
          email: a.email().required(),
          displayName: a.string(),
          role: a.ref("RoleName").required(),
          status: a.ref("MembershipStatus").required(),
          branchIds: a.string().array().required(),
          invitedAt: a.datetime(),
          acceptedAt: a.datetime(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Customer: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          accountNumber: a.string(),
          name: a.string().required(),
          email: a.email(),
          phone: a.phone(),
          billingAddress1: a.string(),
          billingCity: a.string(),
          billingState: a.string(),
          billingPostalCode: a.string(),
          notes: a.string(),
          legacyClientId: a.string(),
          stripeCustomerId: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      CustomerContact: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          name: a.string().required(),
          email: a.email(),
          phone: a.phone(),
          role: a.string(),
          isPrimary: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Property: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          name: a.string().required(),
          address1: a.string().required(),
          city: a.string(),
          state: a.string(),
          postalCode: a.string(),
          sqft: a.float(),
          structureType: a.string(),
          infestationNotes: a.string(),
          legacyClientId: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      ServiceTemplate: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          code: a.string().required(),
          name: a.string().required(),
          description: a.string(),
          isActive: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      RateCard: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          name: a.string().required(),
          isDefault: a.boolean().required(),
          effectiveFrom: a.datetime().required(),
          effectiveTo: a.datetime(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      RateRule: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          rateCardId: a.string().required(),
          code: a.string().required(),
          description: a.string().required(),
          value: a.float().required(),
          minimumCharge: a.float(),
          maximumCharge: a.float(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Quote: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          propertyId: a.string(),
          quoteNumber: a.string().required(),
          status: a.ref("QuoteStatus").required(),
          title: a.string().required(),
          serviceAddressSnapshot: a.string().required(),
          customerNameSnapshot: a.string().required(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          currencyCode: a.string().required(),
          currentRevisionId: a.string().required(),
          sentAt: a.datetime(),
          viewedAt: a.datetime(),
          acceptedAt: a.datetime(),
          declinedAt: a.datetime(),
          expiresAt: a.datetime(),
          voidedAt: a.datetime(),
          legacyVendorId: a.string(),
          legacyClientId: a.string(),
          legacyPayload: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      QuoteRevision: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          revisionNumber: a.integer().required(),
          payload: a.json().required(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          revisedAt: a.datetime().required(),
          revisedBy: a.string().required(),
          notes: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      QuoteLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          revisionId: a.string().required(),
          lineNumber: a.integer().required(),
          description: a.string().required(),
          category: a.string(),
          qty: a.float().required(),
          unitPrice: a.float().required(),
          lineTotal: a.float().required(),
          taxable: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      QuoteAttachment: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          revisionId: a.string(),
          storageKey: a.string().required(),
          fileName: a.string().required(),
          mimeType: a.string().required(),
          size: a.integer().required(),
          capturedAt: a.datetime().required(),
          capturedBy: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      QuoteAcceptance: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          acceptedByName: a.string().required(),
          acceptedByEmail: a.email(),
          acceptedAt: a.datetime().required(),
          acceptedIp: a.ipAddress().required(),
          acceptedUserAgent: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Invoice: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          propertyId: a.string(),
          quoteId: a.string(),
          invoiceNumber: a.string().required(),
          status: a.ref("InvoiceStatus").required(),
          issueDate: a.datetime().required(),
          dueDate: a.datetime(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          paidTotal: a.float().required(),
          outstandingTotal: a.float().required(),
          currencyCode: a.string().required(),
          stripeInvoiceId: a.string(),
          stripeHostedInvoiceUrl: a.url(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      InvoiceLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          invoiceId: a.string().required(),
          lineNumber: a.integer().required(),
          description: a.string().required(),
          qty: a.float().required(),
          unitPrice: a.float().required(),
          lineTotal: a.float().required(),
          taxable: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Payment: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          invoiceId: a.string().required(),
          amount: a.float().required(),
          currencyCode: a.string().required(),
          paymentDate: a.datetime().required(),
          method: a.string().required(),
          status: a.ref("PaymentStatus").required(),
          reference: a.string(),
          provider: a.string().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      EmailMessage: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          entityType: a.ref("PortalEntityType"),
          entityId: a.string().required(),
          to: a.string().array().required(),
          cc: a.string().array().required(),
          subject: a.string().required(),
          template: a.ref("EmailTemplate").required(),
          provider: a.string().required(),
          providerMessageId: a.string(),
          status: a.ref("EmailStatus").required(),
          sentAt: a.datetime(),
          payload: a.json(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      EmailEvent: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          emailMessageId: a.string().required(),
          eventType: a.ref("EmailEventType").required(),
          occurredAt: a.datetime().required(),
          rawPayload: a.string().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      PortalAccessToken: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          entityType: a.ref("PortalEntityType").required(),
          entityId: a.string().required(),
          tokenHash: a.string().required(),
          expiresAt: a.datetime().required(),
          usedAt: a.datetime(),
          revokedAt: a.datetime(),
          lastViewedAt: a.datetime(),
          lastViewedIp: a.ipAddress(),
          lastViewedUserAgent: a.string(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      Subscription: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          provider: a.string().required(),
          plan: a.string().required(),
          status: a.ref("SubscriptionStatus").required(),
          stripeCustomerId: a.string(),
          stripeSubscriptionId: a.string(),
          currentPeriodStart: a.datetime(),
          currentPeriodEnd: a.datetime(),
          cancelAtPeriodEnd: a.boolean().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth),

      AuditEvent: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          actorUserId: a.string(),
          action: a.string().required(),
          entityType: a.string().required(),
          entityId: a.string().required(),
          payload: a.json(),
          occurredAt: a.datetime().required(),
          createdAt: a.datetime().required(),
          updatedAt: a.datetime().required()
        })
        .authorization(internalAuth)
    })
    .authorization((allow) => [allow.groups(TEAM_GROUPS)])
});
