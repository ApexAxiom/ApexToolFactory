import { Customer, Invoice, Job, Organization } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";
import { createJob, todayDateOnly } from "@/server/services/jobs";
import { createPortalToken, touchPortalToken, validatePortalToken } from "@/server/services/portal";

const PORTAL_LINK_TTL_DAYS = 365;

export async function createCustomerPortalLink(input: {
  organizationId: string;
  actorUserId: string;
  customerId: string;
}) {
  const customer = await getStore().get<Customer>("customers", input.customerId);
  if (!customer || customer.organizationId !== input.organizationId) {
    throw new Error("Customer was not found");
  }

  const { token } = await createPortalToken({
    organizationId: input.organizationId,
    entityType: "CUSTOMER",
    entityId: customer.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * PORTAL_LINK_TTL_DAYS).toISOString()
  });

  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "customer.portal_link_created",
    entityType: "Customer",
    entityId: customer.id,
    occurredAt: nowIso(),
    payload: JSON.stringify({})
  });

  return { token, customer };
}

export async function getCustomerPortalView(input: { token: string; ip?: string; userAgent?: string }) {
  const record = await validatePortalToken(input.token, "CUSTOMER");
  const customer = await getStore().get<Customer>("customers", record.entityId);
  if (!customer) {
    throw new Error("Customer was not found");
  }

  const [organization, jobs, invoices] = await Promise.all([
    getStore().get<Organization>("organizations", customer.organizationId),
    getStore().list<Job>("jobs", { organizationId: customer.organizationId, customerId: customer.id }),
    getStore().list<Invoice>("invoices", { organizationId: customer.organizationId, customerId: customer.id })
  ]);

  await touchPortalToken(record, { ip: input.ip, userAgent: input.userAgent });

  const today = todayDateOnly();
  const upcomingJobs = jobs
    .filter(
      (job) =>
        (job.status === "SCHEDULED" || job.status === "IN_PROGRESS") &&
        (!job.scheduledDate || job.scheduledDate >= today)
    )
    .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""));
  const pendingRequests = jobs.filter((job) => job.status === "UNSCHEDULED");
  const completedJobs = jobs
    .filter((job) => job.status === "COMPLETED")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 12);
  const openInvoices = invoices
    .filter((invoice) => invoice.outstandingTotal > 0 && invoice.status !== "VOID")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return { customer, organization, upcomingJobs, pendingRequests, completedJobs, openInvoices };
}

export async function requestVisitFromPortal(input: {
  token: string;
  preferredDate?: string;
  notes?: string;
}) {
  const record = await validatePortalToken(input.token, "CUSTOMER");
  const customer = await getStore().get<Customer>("customers", record.entityId);
  if (!customer) {
    throw new Error("Customer was not found");
  }

  const noteBits = [
    "Requested by the customer through their portal.",
    input.preferredDate ? `Preferred date: ${input.preferredDate}` : null,
    input.notes ? `Customer notes: ${input.notes}` : null
  ].filter(Boolean);

  const job = await createJob({
    organizationId: customer.organizationId,
    actorUserId: "portal",
    customerId: customer.id,
    customerName: customer.name,
    title: "Customer visit request",
    serviceAddress: customer.billingAddress1 || "Service address on file",
    notes: noteBits.join("\n")
  });

  await writeAuditEvent({
    organizationId: customer.organizationId,
    action: "customer.visit_requested",
    entityType: "Job",
    entityId: job.id,
    occurredAt: nowIso(),
    payload: JSON.stringify({ customerId: customer.id, preferredDate: input.preferredDate })
  });

  return job;
}
