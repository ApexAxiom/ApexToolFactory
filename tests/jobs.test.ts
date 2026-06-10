import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";

process.env.DEV_DATA_FILE = join(mkdtempSync(join(tmpdir(), "pestimator-jobs-")), "store.json");

const { addDays, addMonths, ensureJobsForAcceptedQuote, ensureUpcomingJobs, listJobs, nextOccurrence, todayDateOnly } =
  await import("@/server/services/jobs");
const { getStore } = await import("@/server/persistence/store");

type Quote = import("@/domain/types").Quote;
type QuoteRevision = import("@/domain/types").QuoteRevision;
type ServicePlan = import("@/domain/types").ServicePlan;

describe("schedule date math", () => {
  it("adds months and clamps to the end of shorter months", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });

  it("computes the next visit for each cadence", () => {
    expect(nextOccurrence("2026-06-10", "MONTHLY")).toBe("2026-07-10");
    expect(nextOccurrence("2026-06-10", "QUARTERLY")).toBe("2026-09-10");
  });
});

describe("ensureJobsForAcceptedQuote", () => {
  const organizationId = "org-jobs-test";

  async function seedQuote(input: { id: string; visitType: "ONE_TIME" | "MONTHLY"; firstServiceDate?: string }) {
    const timestamp = new Date().toISOString();
    const revisionId = `${input.id}-rev`;
    const quote: Quote = {
      id: input.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId,
      customerId: "customer-1",
      quoteNumber: `Q-${input.id}`,
      status: "ACCEPTED",
      title: "General pest control",
      serviceAddressSnapshot: "123 Main St",
      customerNameSnapshot: "Acme Bakery",
      subtotal: 100,
      taxTotal: 8,
      grandTotal: 108,
      currencyCode: "USD",
      currentRevisionId: revisionId
    };
    const revision: QuoteRevision = {
      id: revisionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId,
      quoteId: input.id,
      revisionNumber: 1,
      payload: {
        customerName: "Acme Bakery",
        propertyAddress: "123 Main St",
        visitType: input.visitType,
        firstServiceDate: input.firstServiceDate,
        pestFindings: [],
        serviceScope: "Scope",
        pricing: {
          baseRatePerSqft: 0.05,
          laborHours: 1,
          laborRate: 85,
          materials: 0,
          travel: 0,
          markupPercent: 0,
          taxPercent: 8
        }
      },
      subtotal: 100,
      taxTotal: 8,
      grandTotal: 108,
      revisedAt: timestamp,
      revisedBy: "tester"
    };
    await getStore().putMany([
      { collection: "quotes", item: quote },
      { collection: "quoteRevisions", item: revision }
    ]);
    return quote;
  }

  it("creates a single unscheduled job for one-time quotes without a service date", async () => {
    const quote = await seedQuote({ id: "quote-one-time", visitType: "ONE_TIME" });

    const result = await ensureJobsForAcceptedQuote(quote);
    expect(result.created).toBe(true);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.status).toBe("UNSCHEDULED");
    expect(result.jobs[0]?.scheduledDate).toBeUndefined();
  });

  it("is idempotent when the portal acceptance is replayed", async () => {
    const quote = await seedQuote({ id: "quote-replayed", visitType: "ONE_TIME" });

    await ensureJobsForAcceptedQuote(quote);
    const second = await ensureJobsForAcceptedQuote(quote);

    expect(second.created).toBe(false);
    const jobs = await listJobs(organizationId);
    expect(jobs.filter((job) => job.quoteId === quote.id)).toHaveLength(1);
  });

  it("creates an active service plan plus a scheduled first visit for recurring quotes", async () => {
    const firstServiceDate = addDays(todayDateOnly(), 7);
    const quote = await seedQuote({ id: "quote-monthly", visitType: "MONTHLY", firstServiceDate });

    const result = await ensureJobsForAcceptedQuote(quote);
    expect(result.jobs[0]?.status).toBe("SCHEDULED");
    expect(result.jobs[0]?.scheduledDate).toBe(firstServiceDate);

    const plans = await getStore().list<ServicePlan>("servicePlans", { organizationId, quoteId: quote.id });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.cadence).toBe("MONTHLY");
    expect(plans[0]?.status).toBe("ACTIVE");

    // The lazy generator fills the next ~90 days with monthly visits.
    await ensureUpcomingJobs(organizationId);
    const jobs = await listJobs(organizationId);
    const planJobs = jobs.filter((job) => job.servicePlanId === plans[0]?.id);
    expect(planJobs.length).toBeGreaterThanOrEqual(3);

    // Running it again must not duplicate visits.
    await ensureUpcomingJobs(organizationId);
    const jobsAfterSecondRun = await listJobs(organizationId);
    expect(jobsAfterSecondRun.filter((job) => job.servicePlanId === plans[0]?.id)).toHaveLength(planJobs.length);
  });
});
