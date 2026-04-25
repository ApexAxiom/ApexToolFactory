import { z } from "zod";

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().optional(),
  SESSION_PASSWORD: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  PERSISTENCE_DRIVER: z.enum(["file", "dynamo"]).default("file"),
  DEV_DATA_FILE: z.string().default(".local/pestimator-dev.json"),
  LOCAL_DEV_LOGIN_ENABLED: z.string().optional(),
  LOCAL_DEV_LOGIN_EMAIL: z.string().email().optional(),
  LOCAL_DEV_LOGIN_PASSWORD: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().optional(),
  SES_FROM_EMAIL: z.string().email().optional(),
  SES_FROM_NAME: z.string().default("Pestimator"),
  S3_ATTACHMENTS_BUCKET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PESTIMATOR_STRIPE_PRICE_ID: z.string().optional(),
  TABLE_ORGANIZATIONS: z.string().optional(),
  TABLE_BRANCHES: z.string().optional(),
  TABLE_ORGANIZATION_MEMBERSHIPS: z.string().optional(),
  TABLE_CUSTOMERS: z.string().optional(),
  TABLE_CUSTOMER_CONTACTS: z.string().optional(),
  TABLE_PROPERTIES: z.string().optional(),
  TABLE_SERVICE_TEMPLATES: z.string().optional(),
  TABLE_RATE_CARDS: z.string().optional(),
  TABLE_RATE_RULES: z.string().optional(),
  TABLE_QUOTES: z.string().optional(),
  TABLE_QUOTE_REVISIONS: z.string().optional(),
  TABLE_QUOTE_LINES: z.string().optional(),
  TABLE_QUOTE_ATTACHMENTS: z.string().optional(),
  TABLE_QUOTE_ACCEPTANCES: z.string().optional(),
  TABLE_INVOICES: z.string().optional(),
  TABLE_INVOICE_LINES: z.string().optional(),
  TABLE_PAYMENTS: z.string().optional(),
  TABLE_EMAIL_MESSAGES: z.string().optional(),
  TABLE_EMAIL_EVENTS: z.string().optional(),
  TABLE_PORTAL_ACCESS_TOKENS: z.string().optional(),
  TABLE_SUBSCRIPTIONS: z.string().optional(),
  TABLE_AUDIT_EVENTS: z.string().optional()
});

const parsed = baseEnvSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_PASSWORD: process.env.SESSION_PASSWORD,
  AWS_REGION: process.env.AWS_REGION,
  PERSISTENCE_DRIVER:
    process.env.PERSISTENCE_DRIVER ??
    (process.env.LOCAL_DEV_LOGIN_ENABLED === "true" ? "file" : process.env.NODE_ENV === "production" ? "dynamo" : "file"),
  DEV_DATA_FILE: process.env.DEV_DATA_FILE,
  LOCAL_DEV_LOGIN_ENABLED: process.env.LOCAL_DEV_LOGIN_ENABLED,
  LOCAL_DEV_LOGIN_EMAIL: process.env.LOCAL_DEV_LOGIN_EMAIL,
  LOCAL_DEV_LOGIN_PASSWORD: process.env.LOCAL_DEV_LOGIN_PASSWORD,
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
  SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
  SES_FROM_NAME: process.env.SES_FROM_NAME,
  S3_ATTACHMENTS_BUCKET: process.env.S3_ATTACHMENTS_BUCKET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  PESTIMATOR_STRIPE_PRICE_ID: process.env.PESTIMATOR_STRIPE_PRICE_ID ?? process.env.Pestimator_STRIPE_PRICE_ID,
  TABLE_ORGANIZATIONS: process.env.TABLE_ORGANIZATIONS,
  TABLE_BRANCHES: process.env.TABLE_BRANCHES,
  TABLE_ORGANIZATION_MEMBERSHIPS: process.env.TABLE_ORGANIZATION_MEMBERSHIPS,
  TABLE_CUSTOMERS: process.env.TABLE_CUSTOMERS,
  TABLE_CUSTOMER_CONTACTS: process.env.TABLE_CUSTOMER_CONTACTS,
  TABLE_PROPERTIES: process.env.TABLE_PROPERTIES,
  TABLE_SERVICE_TEMPLATES: process.env.TABLE_SERVICE_TEMPLATES,
  TABLE_RATE_CARDS: process.env.TABLE_RATE_CARDS,
  TABLE_RATE_RULES: process.env.TABLE_RATE_RULES,
  TABLE_QUOTES: process.env.TABLE_QUOTES,
  TABLE_QUOTE_REVISIONS: process.env.TABLE_QUOTE_REVISIONS,
  TABLE_QUOTE_LINES: process.env.TABLE_QUOTE_LINES,
  TABLE_QUOTE_ATTACHMENTS: process.env.TABLE_QUOTE_ATTACHMENTS,
  TABLE_QUOTE_ACCEPTANCES: process.env.TABLE_QUOTE_ACCEPTANCES,
  TABLE_INVOICES: process.env.TABLE_INVOICES,
  TABLE_INVOICE_LINES: process.env.TABLE_INVOICE_LINES,
  TABLE_PAYMENTS: process.env.TABLE_PAYMENTS,
  TABLE_EMAIL_MESSAGES: process.env.TABLE_EMAIL_MESSAGES,
  TABLE_EMAIL_EVENTS: process.env.TABLE_EMAIL_EVENTS,
  TABLE_PORTAL_ACCESS_TOKENS: process.env.TABLE_PORTAL_ACCESS_TOKENS,
  TABLE_SUBSCRIPTIONS: process.env.TABLE_SUBSCRIPTIONS,
  TABLE_AUDIT_EVENTS: process.env.TABLE_AUDIT_EVENTS
});

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment configuration is invalid");
}

const sessionSecret =
  parsed.data.SESSION_SECRET ||
  parsed.data.SESSION_PASSWORD ||
  "development-session-secret-at-least-32chars";

export const env = {
  ...parsed.data,
  SESSION_SECRET: sessionSecret
};
