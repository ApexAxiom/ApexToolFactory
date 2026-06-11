import { Customer, Invoice, Job, Organization } from "@/domain/types";
import { getJob } from "@/server/services/jobs";
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

export async function createJobConfirmationToken(job: Job) {
  // Valid until a week past the visit so late confirmations still work.
  const base = job.scheduledDate ? new Date(`${job.scheduledDate}T23:59:59Z`).getTime() : Date.now();
  const { token } = await createPortalToken({
    organizationId: job.organizationId,
    entityType: "JOB",
    entityId: job.id,
    expiresAt: new Date(base + 1000 * 60 * 60 * 24 * 7).toISOString()
  });
  return token;
}

export async function getJobPortalView(input: { token: string; ip?: string; userAgent?: string }) {
  const record = await validatePortalToken(input.token, "JOB");
  const job = await getJob(record.entityId);
  if (!job) {
    throw new Error("Appointment was not found");
  }

  const organization = await getStore().get<Organization>("organizations", job.organizationId);
  await touchPortalToken(record, { ip: input.ip, userAgent: input.userAgent });

  return { job, organization };
}

export async function confirmJobFromPortal(input: { token: string; confirmedByName?: string }) {
  const record = await validatePortalToken(input.token, "JOB");
  const job = await getJob(record.entityId);
  if (!job) {
    throw new Error("Appointment was not found");
  }
  if (job.status !== "SCHEDULED") {
    throw new Error("This appointment can no longer be confirmed");
  }

  const timestamp = nowIso();
  const updated: Job = {
    ...job,
    updatedAt: timestamp,
    confirmedAt: timestamp,
    confirmedByName: input.confirmedByName,
    rescheduleRequestedAt: undefined,
    rescheduleRequestNotes: undefined
  };
  await getStore().put("jobs", updated);

  await writeAuditEvent({
    organizationId: job.organizationId,
    action: "job.confirmed_by_customer",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ confirmedByName: input.confirmedByName })
  });

  return updated;
}

export async function requestJobRescheduleFromPortal(input: { token: string; notes?: string }) {
  const record = await validatePortalToken(input.token, "JOB");
  const job = await getJob(record.entityId);
  if (!job) {
    throw new Error("Appointment was not found");
  }
  if (job.status !== "SCHEDULED") {
    throw new Error("This appointment can no longer be changed online");
  }

  const timestamp = nowIso();
  const updated: Job = {
    ...job,
    updatedAt: timestamp,
    confirmedAt: undefined,
    confirmedByName: undefined,
    rescheduleRequestedAt: timestamp,
    rescheduleRequestNotes: input.notes
  };
  await getStore().put("jobs", updated);

  await writeAuditEvent({
    organizationId: job.organizationId,
    action: "job.reschedule_requested",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ notes: input.notes })
  });

  return updated;
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
