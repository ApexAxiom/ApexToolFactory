// Emits runtime env lines (TABLE_*, S3_ATTACHMENTS_BUCKET) derived from
// amplify_outputs.json, which exists in the Amplify build container after
// `ampx pipeline-deploy` but is NOT shipped inside the Next.js server bundle.
// amplify.yml appends this script's stdout to .env.production so the SSR
// runtime never depends on the outputs file being present on disk.
import { existsSync, readFileSync } from "fs";

const OUTPUTS_FILE = "amplify_outputs.json";

const tableEnvNames = {
  organizations: "TABLE_ORGANIZATIONS",
  branches: "TABLE_BRANCHES",
  organizationMemberships: "TABLE_ORGANIZATION_MEMBERSHIPS",
  customers: "TABLE_CUSTOMERS",
  customerContacts: "TABLE_CUSTOMER_CONTACTS",
  properties: "TABLE_PROPERTIES",
  serviceTemplates: "TABLE_SERVICE_TEMPLATES",
  rateCards: "TABLE_RATE_CARDS",
  rateRules: "TABLE_RATE_RULES",
  quotes: "TABLE_QUOTES",
  quoteRevisions: "TABLE_QUOTE_REVISIONS",
  quoteLines: "TABLE_QUOTE_LINES",
  quoteAttachments: "TABLE_QUOTE_ATTACHMENTS",
  quoteAcceptances: "TABLE_QUOTE_ACCEPTANCES",
  invoices: "TABLE_INVOICES",
  invoiceLines: "TABLE_INVOICE_LINES",
  jobs: "TABLE_JOBS",
  servicePlans: "TABLE_SERVICE_PLANS",
  payments: "TABLE_PAYMENTS",
  emailMessages: "TABLE_EMAIL_MESSAGES",
  emailEvents: "TABLE_EMAIL_EVENTS",
  portalAccessTokens: "TABLE_PORTAL_ACCESS_TOKENS",
  subscriptions: "TABLE_SUBSCRIPTIONS",
  auditEvents: "TABLE_AUDIT_EVENTS",
  webhookEvents: "TABLE_WEBHOOK_EVENTS"
};

if (!existsSync(OUTPUTS_FILE)) {
  console.error(`${OUTPUTS_FILE} not found - skipping runtime env generation`);
  process.exit(0);
}

const outputs = JSON.parse(readFileSync(OUTPUTS_FILE, "utf8"));
const tables = outputs.custom?.dynamodbTables ?? {};
const lines = [];

for (const [collection, envName] of Object.entries(tableEnvNames)) {
  if (!process.env[envName] && tables[collection]) {
    lines.push(`${envName}=${tables[collection]}`);
  }
}

const bucket = outputs.custom?.storage?.attachmentsBucket;
if (bucket && !process.env.S3_ATTACHMENTS_BUCKET) {
  lines.push(`S3_ATTACHMENTS_BUCKET=${bucket}`);
}

const missing = Object.keys(tableEnvNames).filter(
  (collection) => !tables[collection] && !process.env[tableEnvNames[collection]]
);
if (missing.length > 0) {
  console.error(`Warning: no table name resolved for: ${missing.join(", ")}`);
}

process.stdout.write(lines.join("\n") + "\n");
