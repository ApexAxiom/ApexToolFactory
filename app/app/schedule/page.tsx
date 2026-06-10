import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, UserRound } from "lucide-react";
import { Job } from "@/domain/types";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, dateOnly } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { ensureUpcomingJobs, listJobs, todayDateOnly, addDays } from "@/server/services/jobs";
import { listCustomers } from "@/server/services/customers";
import { listTeamMembers } from "@/server/services/team";
import { createJobAction, scheduleJobAction } from "@/server/actions/app";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

const statusDot: Record<Job["status"], string> = {
  UNSCHEDULED: "bg-gold",
  SCHEDULED: "bg-blue-500",
  IN_PROGRESS: "bg-moss",
  COMPLETED: "bg-emerald",
  CANCELED: "bg-slate-300"
};

export default async function SchedulePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  // Extend recurring service plans whenever the calendar is opened.
  await ensureUpcomingJobs(context.organization.id);

  const [jobs, customers, members] = await Promise.all([
    listJobs(context.organization.id),
    listCustomers(context.organization.id),
    listTeamMembers(context.organization.id)
  ]);

  const params = await searchParams;
  const today = todayDateOnly();
  const monthParam = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : today.slice(0, 7);

  const calendar = buildMonthGrid(monthParam);
  const jobsByDate = new Map<string, Job[]>();
  for (const job of jobs) {
    if (!job.scheduledDate || job.status === "CANCELED") continue;
    const list = jobsByDate.get(job.scheduledDate) ?? [];
    list.push(job);
    jobsByDate.set(job.scheduledDate, list);
  }

  const unscheduled = jobs.filter((job) => job.status === "UNSCHEDULED");
  const horizon = addDays(today, 14);
  const upcoming = jobs.filter(
    (job) =>
      job.scheduledDate &&
      job.scheduledDate >= today &&
      job.scheduledDate <= horizon &&
      (job.status === "SCHEDULED" || job.status === "IN_PROGRESS")
  );

  const activeMembers = members.filter((member) => member.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Schedule"
        title="Service calendar"
        description="Every accepted quote lands here. Book visits, assign technicians, and keep the route full."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{calendar.label}</h2>
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/schedule?month=${calendar.previousMonth}`}
                  className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted hover:text-ink"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <Link
                  href="/app/schedule"
                  className="inline-flex h-9 items-center rounded-md border border-line px-3 text-sm font-semibold text-muted hover:text-ink"
                >
                  Today
                </Link>
                <Link
                  href={`/app/schedule?month=${calendar.nextMonth}`}
                  className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted hover:text-ink"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="bg-canvas px-2 py-2 text-center text-xs font-semibold uppercase text-muted">
                  {day}
                </div>
              ))}
              {calendar.cells.map((cell) => {
                const dayJobs = cell.date ? (jobsByDate.get(cell.date) ?? []) : [];
                return (
                  <div
                    key={cell.key}
                    className={cn(
                      "min-h-24 bg-white p-1.5",
                      !cell.date && "bg-canvas/60",
                      cell.date === today && "bg-mist/60"
                    )}
                  >
                    {cell.date ? (
                      <>
                        <div
                          className={cn(
                            "mb-1 text-xs font-semibold",
                            cell.date === today
                              ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-white"
                              : "text-muted"
                          )}
                        >
                          {cell.dayOfMonth}
                        </div>
                        <div className="space-y-1">
                          {dayJobs.slice(0, 3).map((job) => (
                            <Link
                              key={job.id}
                              href={`/app/jobs/${job.id}`}
                              className="flex items-center gap-1.5 rounded bg-canvas px-1.5 py-1 text-xs font-semibold leading-4 text-ink hover:bg-mist"
                              title={`${job.title} - ${job.customerNameSnapshot}`}
                            >
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot[job.status])} />
                              <span className="truncate">
                                {job.scheduledStartTime ? `${job.scheduledStartTime} ` : ""}
                                {job.customerNameSnapshot}
                              </span>
                            </Link>
                          ))}
                          {dayJobs.length > 3 ? (
                            <div className="px-1.5 text-xs font-semibold text-muted">+{dayJobs.length - 3} more</div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="mb-4 flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-emerald" />
              <div>
                <h2 className="text-lg font-semibold">Next 14 days</h2>
                <p className="text-sm text-muted">Confirmed and in-progress visits, soonest first.</p>
              </div>
            </div>
            <div className="space-y-2">
              {upcoming.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/jobs/${job.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{job.customerNameSnapshot}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {dateOnly(job.scheduledDate)}
                        {job.scheduledStartTime ? ` at ${job.scheduledStartTime}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-4 w-4" />
                        {job.serviceAddress}
                      </span>
                      {job.assignedToName ? (
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-4 w-4" />
                          {job.assignedToName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StatusPill status={job.status} />
                </Link>
              ))}
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
                  Nothing booked in the next two weeks. Schedule a job or send more quotes.
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-semibold">Needs scheduling</h2>
            <p className="mt-1 text-sm text-muted">Accepted work waiting for a date.</p>
            <div className="mt-4 space-y-3">
              {unscheduled.map((job) => (
                <div key={job.id} className="rounded-lg border border-line p-3">
                  <Link href={`/app/jobs/${job.id}`} className="font-semibold text-ink hover:text-emerald">
                    {job.customerNameSnapshot}
                  </Link>
                  <div className="mt-1 truncate text-sm text-muted">{job.title}</div>
                  <form action={scheduleJobAction} className="mt-3 flex items-end gap-2">
                    <input type="hidden" name="jobId" value={job.id} />
                    <label className="flex-1 space-y-1 text-xs font-semibold text-muted">
                      Service date
                      <input className={inputClass} type="date" name="scheduledDate" required min={today} />
                    </label>
                    <SubmitButton className="h-10" pendingText="Booking...">
                      Book
                    </SubmitButton>
                  </form>
                </div>
              ))}
              {unscheduled.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                  All caught up — every job has a date.
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Book a job</h2>
            <p className="mt-1 text-sm text-muted">Schedule one-off or follow-up work directly.</p>
            <form action={createJobAction} className="mt-4 grid gap-3">
              <label className="space-y-1 text-sm font-semibold">
                Client
                <select className={inputClass} name="customerId" required defaultValue="">
                  <option value="" disabled>
                    Select a client
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold">
                Job title
                <input className={inputClass} name="title" required placeholder="Quarterly pest control visit" />
              </label>
              <label className="space-y-1 text-sm font-semibold">
                Service address
                <input className={inputClass} name="serviceAddress" placeholder="Defaults to billing address" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm font-semibold">
                  Date
                  <input className={inputClass} type="date" name="scheduledDate" min={today} />
                </label>
                <label className="space-y-1 text-sm font-semibold">
                  Start time
                  <input className={inputClass} type="time" name="scheduledStartTime" />
                </label>
              </div>
              <label className="space-y-1 text-sm font-semibold">
                Assign to
                <select className={inputClass} name="assignedToName" defaultValue="">
                  <option value="">Unassigned</option>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.displayName || member.email}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-semibold">
                Notes
                <input className={inputClass} name="notes" placeholder="Gate code, access notes..." />
              </label>
              <SubmitButton pendingText="Creating job...">
                <Plus className="h-4 w-4" />
                Create job
              </SubmitButton>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function buildMonthGrid(month: string) {
  const [year = 1970, monthNumber = 1] = month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = firstDay.getUTCDay();

  const cells: Array<{ key: string; date?: string; dayOfMonth?: number }> = [];
  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({ key: `blank-start-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: date, date, dayOfMonth: day });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}` });
  }

  const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(firstDay);
  const previous = new Date(Date.UTC(year, monthIndex - 1, 1));
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  const toParam = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    label,
    cells,
    previousMonth: toParam(previous),
    nextMonth: toParam(next)
  };
}
