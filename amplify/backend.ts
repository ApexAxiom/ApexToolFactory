import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

export const backend = defineBackend({
  auth,
  data,
  storage
});

backend.addOutput({
  custom: {
    dynamodbTables: {
      organizations: backend.data.resources.tables.Organization.tableName,
      branches: backend.data.resources.tables.Branch.tableName,
      organizationMemberships: backend.data.resources.tables.OrganizationMembership.tableName,
      customers: backend.data.resources.tables.Customer.tableName,
      customerContacts: backend.data.resources.tables.CustomerContact.tableName,
      properties: backend.data.resources.tables.Property.tableName,
      serviceTemplates: backend.data.resources.tables.ServiceTemplate.tableName,
      rateCards: backend.data.resources.tables.RateCard.tableName,
      rateRules: backend.data.resources.tables.RateRule.tableName,
      quotes: backend.data.resources.tables.Quote.tableName,
      quoteRevisions: backend.data.resources.tables.QuoteRevision.tableName,
      quoteLines: backend.data.resources.tables.QuoteLine.tableName,
      quoteAttachments: backend.data.resources.tables.QuoteAttachment.tableName,
      quoteAcceptances: backend.data.resources.tables.QuoteAcceptance.tableName,
      invoices: backend.data.resources.tables.Invoice.tableName,
      invoiceLines: backend.data.resources.tables.InvoiceLine.tableName,
      payments: backend.data.resources.tables.Payment.tableName,
      emailMessages: backend.data.resources.tables.EmailMessage.tableName,
      emailEvents: backend.data.resources.tables.EmailEvent.tableName,
      portalAccessTokens: backend.data.resources.tables.PortalAccessToken.tableName,
      subscriptions: backend.data.resources.tables.Subscription.tableName,
      auditEvents: backend.data.resources.tables.AuditEvent.tableName
    },
    storage: {
      attachmentsBucket: backend.storage.resources.bucket.bucketName
    }
  }
});
