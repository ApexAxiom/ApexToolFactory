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
  "payments",
  "emailMessages",
  "emailEvents",
  "portalAccessTokens",
  "subscriptions",
  "auditEvents"
] as const;

export type CollectionName = (typeof collections)[number];
