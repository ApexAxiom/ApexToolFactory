import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Play, UserRound, XCircle } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SubmitButton } from "@/components/ui/submit-button";
import { dateOnly, dateTime } from "@/lib/utils";
import { requireSession } from "@/server/auth/session";
import { getActiveOrganizationContext } from "@/server/auth/context";
import { hasPermission } from "@/server/auth/permissions";
import { getJob, todayDateOnly } from "@/server/services/jobs";
import { getCustomer } from "@/server/services/customers";
import { listTeamMembers } from "@/server/services/team";
import {
  cancelJobAction,
  completeJobAction,
  scheduleJobAction,
  sendJobConfirmationAction,
  startJobAction
} from "@/server/actions/app";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const context = await getActiveOrganizationContext(session);
  if (!context) return null;

  const { id } = await params;
  const job = await getJob(id);
  if (!job || job.organizationId !== context.organization.id) notFound();

  const [customer, members] = await Promise.all([
    getCustomer(job.customerId),
    listTeamMembers(context.organization.id)
  ]);
  const activeMembers = members.filter((member) => member.status === "ACTIVE");

  const canManage = hasPermission(context.membership, "jobs:write");
  const canUpdateStatus = hasPermission(context.membership, "jobs:update-status");
  const isOpen = job.status === "UNSCHEDULED" || job.status === "SCHEDULED" || job.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/schedule" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald">
          <ArrowLeft className="h-4 w-4" />
          Back to schedule
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{job.jobNumber}</span>
          <StatusPill status={job.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DetailItem icon={UserRound} label="Client">
                {customer ? (
                  <Link href={`/app/customers/${customer.id}`} className="font-semibold text-emerald">
                    {job.customerNameSnapshot}
                  </Link>
                ) : (
                  job.customerNameSnapshot
                )}
              </DetailItem>
              <DetailItem icon={MapPin} label="Service address">
                {job.serviceAddress}
              </DetailItem>
              <DetailItem icon={CalendarDays} label="Scheduled">
                {job.scheduledDate
                  ? `${dateOnly(job.scheduledDate)}${job.scheduledStartTime ? ` at ${job.scheduledStartTime}` : ""}${
                      job.scheduledEndTime ? ` - ${job.scheduledEndTime}` : ""
                    }`
                  : "Not scheduled yet"}
              </DetailItem>
              <DetailItem icon={UserRound} label="Assigned to">
                {job.assignedToName || "Unassigned"}
              </DetailItem>
            </div>
            {job.notes ? (
              <div className="mt-5 rounded-lg border border-line bg-canvas p-4 text-sm leading-6 text-ink/80">
                {job.notes}
              </div>
            ) : null}
          </Panel>

          {job.status === "COMPLETED" ? (
            <Panel>
              <div className="mb-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald" />
                <h2 className="text-lg font-semibold">Service report</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-muted">Completed</dt>
                  <dd className="mt-1">{dateTime(job.completedAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Work performed</dt>
                  <dd className="mt-1 leading-6">{job.completionNotes || "No notes recorded"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Materials / chemicals applied</dt>
                  <dd className="mt-1 leading-6">{job.materialsUsed || "None recorded"}</dd>
                </div>
              </dl>
            </Panel>
          ) : null}

          {canUpdateStatus && (job.status === "SCHEDULED" || job.status === "IN_PROGRESS") ? (
            <Panel>
              <h2 className="text-lg font-semibold">Complete this job</h2>
              <p className="mt-1 text-sm text-muted">
                Record what was done and which materials were applied. This becomes the permanent service report.
              </p>
              <form action={completeJobAction} className="mt-4 grid gap-3">
                <input type="hidden" name="jobId" value={job.id} />
                <label className="space-y-1 text-sm font-semibold">
                  Work performed
                  <textarea
                    className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                    name="completionNotes"
                    placeholder="Treated exterior perimeter, replaced bait stations 3 and 7..."
                  />
                </label>
                <label className="space-y-1 text-sm font-semibold">
                  Materials / chemicals applied
                  <input className={inputClass} name="materialsUsed" placeholder="e.g. Termidor SC 0.06%, 2 gal" />
                </label>
                <SubmitButton pendingText="Saving report...">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark completed
                </SubmitButton>
              </form>
            </Panel>
          ) : null}
        </div>

        <aside className="h-fit space-y-5 xl:sticky xl:top-28">
          {canManage && isOpen ? (
            <Panel>
              <h2 className="text-lg font-semibold">{job.scheduledDate ? "Reschedule" : "Schedule"}</h2>
              <form action={scheduleJobAction} className="mt-4 grid gap-3">
                <input type="hidden" name="jobId" value={job.id} />
                <label className="space-y-1 text-sm font-semibold">
                  Service date
                  <input
                    className={inputClass}
                    type="date"
                    name="scheduledDate"
                    required
                    defaultValue={job.scheduledDate ?? ""}
                    min={todayDateOnly()}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-sm font-semibold">
                    Start
                    <input className={inputClass} type="time" name="scheduledStartTime" defaultValue={job.scheduledStartTime ?? ""} />
                  </label>
                  <label className="space-y-1 text-sm font-semibold">
                    End
                    <input className={inputClass} type="time" name="scheduledEndTime" defaultValue={job.scheduledEndTime ?? ""} />
                  </label>
                </div>
                <label className="space-y-1 text-sm font-semibold">
                  Assign to
                  <select className={inputClass} name="assignedToName" defaultValue={job.assignedToName ?? ""}>
                    <option value="">Unassigned</option>
                    {activeMembers.map((member) => (
                      <option key={member.id} value={member.displayName || member.email}>
                        {member.displayName || member.email}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton pendingText="Saving...">
                  <CalendarDays className="h-4 w-4" />
                  {job.scheduledDate ? "Update schedule" : "Put on calendar"}
                </SubmitButton>
              </form>
            </Panel>
          ) : null}

          {canManage && job.status === "SCHEDULED" ? (
            <Panel>
              <h2 className="text-lg font-semibold">Confirm with the customer</h2>
              <p className="mt-1 text-sm text-muted">Email the visit date, arrival window, and technician.</p>
              <form action={sendJobConfirmationAction} className="mt-4 space-y-3">
                <input type="hidden" name="jobId" value={job.id} />
                <label className="block space-y-1 text-sm font-semibold">
                  Recipient email
                  <input
                    className={inputClass}
                    name="recipientEmail"
                    type="email"
                    required
                    defaultValue={customer?.email ?? ""}
                  />
                </label>
                <SubmitButton className="w-full" variant="secondary" pendingText="Sending...">
                  Send confirmation email
                </SubmitButton>
              </form>
            </Panel>
          ) : null}

          {canUpdateStatus && job.status === "SCHEDULED" ? (
            <Panel>
              <form action={startJobAction}>
                <input type="hidden" name="jobId" value={job.id} />
                <SubmitButton className="w-full" variant="secondary" pendingText="Starting...">
                  <Play className="h-4 w-4" />
                  Start job
                </SubmitButton>
              </form>
            </Panel>
          ) : null}

          {canManage && isOpen ? (
            <Panel>
              <h2 className="text-sm font-semibold text-muted">Danger zone</h2>
              <form action={cancelJobAction} className="mt-3">
                <input type="hidden" name="jobId" value={job.id} />
                <SubmitButton className="w-full" variant="danger" pendingText="Canceling...">
                  <XCircle className="h-4 w-4" />
                  Cancel job
                </SubmitButton>
              </form>
            </Panel>
          ) : null}

          {job.quoteId ? (
            <Panel>
              <h2 className="text-sm font-semibold text-muted">Origin</h2>
              <Link href={`/app/quotes/${job.quoteId}`} className="mt-2 inline-block text-sm font-semibold text-emerald">
                View the accepted quote
              </Link>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  children
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-emerald" />
      <div>
        <div className="text-xs font-semibold text-muted">{label}</div>
        <div className="mt-1 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}
