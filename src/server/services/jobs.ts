import { randomUUID } from "crypto";
import {
  Job,
  Quote,
  QuoteRevision,
  ServiceCadence,
  ServicePlan
} from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";

const GENERATION_HORIZON_DAYS = 90;

export async function listJobs(organizationId: string) {
  const jobs = await getStore().list<Job>("jobs", { organizationId });
  return jobs.sort(byScheduleOrder);
}

export async function getJob(jobId: string) {
  return getStore().get<Job>("jobs", jobId);
}

export async function listJobsForCustomer(organizationId: string, customerId: string) {
  const jobs = await getStore().list<Job>("jobs", { organizationId, customerId });
  return jobs.sort(byScheduleOrder);
}

export async function listServicePlans(organizationId: string) {
  return getStore().list<ServicePlan>("servicePlans", { organizationId });
}

export async function createJob(input: {
  organizationId: string;
  actorUserId: string;
  customerId: string;
  customerName: string;
  propertyId?: string;
  quoteId?: string;
  servicePlanId?: string;
  title: string;
  serviceAddress: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  assignedMembershipId?: string;
  assignedToName?: string;
  notes?: string;
}) {
  const timestamp = nowIso();
  const job: Job = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    customerId: input.customerId,
    propertyId: input.propertyId,
    quoteId: input.quoteId,
    servicePlanId: input.servicePlanId,
    jobNumber: await nextJobNumber(),
    title: input.title,
    status: input.scheduledDate ? "SCHEDULED" : "UNSCHEDULED",
    serviceAddress: input.serviceAddress,
    customerNameSnapshot: input.customerName,
    scheduledDate: input.scheduledDate,
    scheduledStartTime: input.scheduledStartTime,
    scheduledEndTime: input.scheduledEndTime,
    assignedMembershipId: input.assignedMembershipId,
    assignedToName: input.assignedToName,
    notes: input.notes
  };

  await getStore().put("jobs", job);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "job.created",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ scheduledDate: job.scheduledDate, customerId: job.customerId })
  });

  return job;
}

export async function scheduleJob(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  scheduledDate: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  assignedMembershipId?: string;
  assignedToName?: string;
}) {
  const job = await requireOrganizationJob(input.jobId, input.organizationId);
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    throw new Error(`A ${job.status.toLowerCase()} job cannot be rescheduled`);
  }

  const timestamp = nowIso();
  const updated: Job = {
    ...job,
    updatedAt: timestamp,
    status: "SCHEDULED",
    scheduledDate: input.scheduledDate,
    scheduledStartTime: input.scheduledStartTime ?? job.scheduledStartTime,
    scheduledEndTime: input.scheduledEndTime ?? job.scheduledEndTime,
    assignedMembershipId: input.assignedMembershipId ?? job.assignedMembershipId,
    assignedToName: input.assignedToName ?? job.assignedToName
  };

  await getStore().put("jobs", updated);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "job.scheduled",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ from: job.scheduledDate, to: input.scheduledDate })
  });

  return updated;
}

export async function startJob(input: { organizationId: string; actorUserId: string; jobId: string }) {
  const job = await requireOrganizationJob(input.jobId, input.organizationId);
  if (job.status !== "SCHEDULED") {
    throw new Error("Only scheduled jobs can be started");
  }

  const timestamp = nowIso();
  const updated: Job = { ...job, updatedAt: timestamp, status: "IN_PROGRESS", startedAt: timestamp };
  await getStore().put("jobs", updated);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "job.started",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({})
  });
  return updated;
}

export async function completeJob(input: {
  organizationId: string;
  actorUserId: string;
  jobId: string;
  completionNotes?: string;
  materialsUsed?: string;
}) {
  const job = await requireOrganizationJob(input.jobId, input.organizationId);
  if (job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS") {
    throw new Error("Only scheduled or in-progress jobs can be completed");
  }

  const timestamp = nowIso();
  const updated: Job = {
    ...job,
    updatedAt: timestamp,
    status: "COMPLETED",
    completedAt: timestamp,
    startedAt: job.startedAt ?? timestamp,
    completionNotes: input.completionNotes,
    materialsUsed: input.materialsUsed
  };

  await getStore().put("jobs", updated);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "job.completed",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ materialsUsed: input.materialsUsed })
  });

  return updated;
}

export async function cancelJob(input: { organizationId: string; actorUserId: string; jobId: string }) {
  const job = await requireOrganizationJob(input.jobId, input.organizationId);
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    throw new Error(`A ${job.status.toLowerCase()} job cannot be canceled`);
  }

  const timestamp = nowIso();
  const updated: Job = { ...job, updatedAt: timestamp, status: "CANCELED", canceledAt: timestamp };
  await getStore().put("jobs", updated);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "job.canceled",
    entityType: "Job",
    entityId: job.id,
    occurredAt: timestamp,
    payload: JSON.stringify({})
  });
  return updated;
}

/**
 * Turns an accepted quote into scheduled work: one-time quotes get a single
 * job, recurring quotes get an active service plan plus the first visit.
 * Safe to call more than once for the same quote (portal links can be
 * re-submitted) — existing jobs short-circuit the creation.
 */
export async function ensureJobsForAcceptedQuote(quote: Quote) {
  const existing = await getStore().list<Job>("jobs", {
    organizationId: quote.organizationId,
    quoteId: quote.id
  });
  if (existing.length > 0) {
    return { created: false as const, jobs: existing };
  }

  const revision = await getStore().get<QuoteRevision>("quoteRevisions", quote.currentRevisionId);
  const cadence: ServiceCadence = revision?.payload.visitType ?? "ONE_TIME";
  const firstServiceDate = normalizeDateOnly(revision?.payload.firstServiceDate);
  const timestamp = nowIso();

  let servicePlanId: string | undefined;
  if (cadence !== "ONE_TIME") {
    const plan: ServicePlan = {
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: quote.organizationId,
      customerId: quote.customerId,
      propertyId: quote.propertyId,
      quoteId: quote.id,
      name: quote.title,
      cadence,
      status: "ACTIVE",
      startDate: firstServiceDate ?? todayDateOnly(),
      lastGeneratedDate: firstServiceDate ?? todayDateOnly()
    };
    await getStore().put("servicePlans", plan);
    servicePlanId = plan.id;
  }

  const job = await createJob({
    organizationId: quote.organizationId,
    actorUserId: "portal",
    customerId: quote.customerId,
    customerName: quote.customerNameSnapshot,
    propertyId: quote.propertyId,
    quoteId: quote.id,
    servicePlanId,
    title: quote.title,
    serviceAddress: quote.serviceAddressSnapshot,
    scheduledDate: firstServiceDate,
    notes: cadence === "ONE_TIME" ? undefined : `First visit of ${cadence.toLowerCase()} service plan`
  });

  return { created: true as const, jobs: [job] };
}

/**
 * Lazily extends recurring service plans so the calendar always shows visits
 * for the next GENERATION_HORIZON_DAYS. Called when the schedule loads, so no
 * background scheduler is required.
 */
export async function ensureUpcomingJobs(organizationId: string) {
  const plans = await getStore().list<ServicePlan>("servicePlans", { organizationId, status: "ACTIVE" });
  if (plans.length === 0) return;

  const horizon = addDays(todayDateOnly(), GENERATION_HORIZON_DAYS);

  for (const plan of plans) {
    let cursor = plan.lastGeneratedDate ?? plan.startDate;
    let generated = 0;

    while (true) {
      const next = nextOccurrence(cursor, plan.cadence);
      if (next > horizon || generated >= 12) break;

      await createJob({
        organizationId: plan.organizationId,
        actorUserId: "scheduler",
        customerId: plan.customerId,
        customerName: await customerNameForPlan(plan),
        propertyId: plan.propertyId,
        quoteId: plan.quoteId,
        servicePlanId: plan.id,
        title: plan.name,
        serviceAddress: await serviceAddressForPlan(plan),
        scheduledDate: next,
        notes: `Recurring ${plan.cadence.toLowerCase()} visit`
      });

      cursor = next;
      generated += 1;
    }

    if (generated > 0) {
      await getStore().put("servicePlans", {
        ...plan,
        updatedAt: nowIso(),
        lastGeneratedDate: cursor
      });
    }
  }
}

export function nextOccurrence(dateOnly: string, cadence: ServiceCadence) {
  return addMonths(dateOnly, cadence === "MONTHLY" ? 1 : 3);
}

export function addMonths(dateOnly: string, months: number) {
  const [year = 1970, month = 1, day = 1] = dateOnly.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTarget = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTarget);
  return formatDateOnly(new Date(Date.UTC(targetYear, normalizedMonth, targetDay)));
}

export function addDays(dateOnly: string, days: number) {
  const [year = 1970, month = 1, day = 1] = dateOnly.split("-").map(Number);
  return formatDateOnly(new Date(Date.UTC(year, month - 1, day + days)));
}

export function todayDateOnly() {
  return formatDateOnly(new Date());
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDateOnly(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
}

function byScheduleOrder(a: Job, b: Job) {
  const aKey = `${a.scheduledDate ?? "9999-99-99"}T${a.scheduledStartTime ?? "99:99"}`;
  const bKey = `${b.scheduledDate ?? "9999-99-99"}T${b.scheduledStartTime ?? "99:99"}`;
  return aKey.localeCompare(bKey);
}

async function requireOrganizationJob(jobId: string, organizationId: string) {
  const job = await getJob(jobId);
  if (!job || job.organizationId !== organizationId) {
    throw new Error("Job was not found");
  }
  return job;
}

async function customerNameForPlan(plan: ServicePlan) {
  const customer = await getStore().get<{ id: string; name: string }>("customers", plan.customerId);
  return customer?.name ?? "Customer";
}

async function serviceAddressForPlan(plan: ServicePlan) {
  const quote = await getStore().get<Quote>("quotes", plan.quoteId);
  return quote?.serviceAddressSnapshot ?? "Service address on file";
}

async function nextJobNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existing = await getStore().list<Job>("jobs");
  const count = existing.filter((item) => item.jobNumber.startsWith(`J${today}`)).length + 1;
  return `J${today}-${String(count).padStart(4, "0")}`;
}
