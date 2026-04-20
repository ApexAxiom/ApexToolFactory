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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "branchesByOrganization"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "organizationMembershipsByOrganization"
          }),
          index("byUser", {
            sortKey: "createdAt",
            queryField: "organizationMembershipsByUser"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "customersByOrganization"
          }),
          index("byLegacyClientId", {
            sortKey: "createdAt",
            queryField: "customerByLegacyClientId"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byCustomer", {
            sortKey: "createdAt",
            queryField: "customerContactsByCustomer"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byCustomer", {
            sortKey: "createdAt",
            queryField: "propertiesByCustomer"
          }),
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "propertiesByOrganization"
          })
        ]),

      ServiceTemplate: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          code: a.string().required(),
          name: a.string().required(),
          description: a.string(),
          isActive: a.boolean().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "serviceTemplatesByOrganization"
          })
        ]),

      RateCard: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          name: a.string().required(),
          isDefault: a.boolean().required(),
          effectiveFrom: a.datetime().required(),
          effectiveTo: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "effectiveFrom",
            queryField: "rateCardsByOrganization"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byRateCard", {
            sortKey: "createdAt",
            queryField: "rateRulesByRateCard"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "quotesByOrganization"
          }),
          index("byCustomer", {
            sortKey: "createdAt",
            queryField: "quotesByCustomer"
          }),
          index("byStatus", {
            sortKey: "createdAt",
            queryField: "quotesByStatus"
          }),
          index("byQuoteNumber", {
            sortKey: "createdAt",
            queryField: "quoteByNumber"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byQuote", {
            sortKey: "revisionNumber",
            queryField: "quoteRevisionsByQuote"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byQuote", {
            sortKey: "lineNumber",
            queryField: "quoteLinesByQuote"
          }),
          index("byRevision", {
            sortKey: "lineNumber",
            queryField: "quoteLinesByRevision"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byQuote", {
            sortKey: "createdAt",
            queryField: "quoteAttachmentsByQuote"
          }),
          index("byStorageKey", {
            sortKey: "createdAt",
            queryField: "quoteAttachmentByStorageKey"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byQuote", {
            sortKey: "acceptedAt",
            queryField: "quoteAcceptancesByQuote"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "issueDate",
            queryField: "invoicesByOrganization"
          }),
          index("byCustomer", {
            sortKey: "issueDate",
            queryField: "invoicesByCustomer"
          }),
          index("byStatus", {
            sortKey: "issueDate",
            queryField: "invoicesByStatus"
          }),
          index("byQuote", {
            sortKey: "issueDate",
            queryField: "invoiceByQuote"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byInvoice", {
            sortKey: "lineNumber",
            queryField: "invoiceLinesByInvoice"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byInvoice", {
            sortKey: "paymentDate",
            queryField: "paymentsByInvoice"
          }),
          index("byOrganization", {
            sortKey: "paymentDate",
            queryField: "paymentsByOrganization"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "emailMessagesByOrganization"
          }),
          index("byEntity", {
            sortKey: "createdAt",
            queryField: "emailMessagesByEntity"
          }),
          index("byProviderMessageId", {
            sortKey: "createdAt",
            queryField: "emailMessageByProviderMessageId"
          })
        ]),

      EmailEvent: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          emailMessageId: a.string().required(),
          eventType: a.ref("EmailEventType").required(),
          occurredAt: a.datetime().required(),
          rawPayload: a.string().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byMessage", {
            sortKey: "occurredAt",
            queryField: "emailEventsByMessage"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byEntity", {
            sortKey: "createdAt",
            queryField: "portalTokensByEntity"
          }),
          index("byTokenHash", {
            sortKey: "createdAt",
            queryField: "portalTokenByHash"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "createdAt",
            queryField: "subscriptionsByOrganization"
          })
        ]),

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
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(internalAuth)
        .secondaryIndexes((index) => [
          index("byOrganization", {
            sortKey: "occurredAt",
            queryField: "auditEventsByOrganization"
          }),
          index("byEntity", {
            sortKey: "occurredAt",
            queryField: "auditEventsByEntity"
          })
        ])
    })
    .authorization((allow) => [allow.groups(TEAM_GROUPS)])
});
