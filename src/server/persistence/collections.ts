export const collections = [
  "organizations",
  "branches",
  "organizationMemberships",
  "customers",
  "customerContacts",
  "properties",
  "serviceTemplates",
  "rateCards",
  "rateRules",
  "quotes",
  "quoteRevisions",
  "quoteLines",
  "quoteAttachments",
  "quoteAcceptances",
  "invoices",
  "invoiceLines",
  "jobs",
  "servicePlans",
  "payments",
  "emailMessages",
  "emailEvents",
  "portalAccessTokens",
  "subscriptions",
  "auditEvents",
  "webhookEvents"
] as const;

export type CollectionName = (typeof collections)[number];
