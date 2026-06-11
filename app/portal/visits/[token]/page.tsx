import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, Send, UserRound } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { ApexAxiomMark } from "@/components/ui/brand";
import { dateOnly } from "@/lib/utils";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";
import { getJobPortalView } from "@/server/services/customer-portal";

export default async function VisitPortalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string; reschedule?: string }>;
}) {
  const { token } = await params;
  const { confirmed, reschedule } = await searchParams;
  const requestHeaders = await headers();
  const view = await getJobPortalView({
    token,
    ip: getRequestIp(requestHeaders),
    userAgent: getUserAgent(requestHeaders)
  }).catch(() => null);
  if (!view) notFound();

  const { job, organization } = view;
  const companyName = organization?.name ?? "Your service provider";
  const window =
    job.scheduledStartTime && job.scheduledEndTime
      ? `between ${job.scheduledStartTime} and ${job.scheduledEndTime}`
      : job.scheduledStartTime
        ? `starting around ${job.scheduledStartTime}`
        : "during business hours";

  return (
    <main className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="text-xl font-semibold text-ink">{companyName}</div>
          <div className="text-sm text-muted">
            {[organization?.supportPhone, organization?.supportEmail].filter(Boolean).join(" | ") ||
              "Appointment confirmation"}
          </div>
        </div>

        {confirmed ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/5 p-4 text-sm font-semibold text-emerald">
            <CheckCircle2 className="h-5 w-5" />
            Thank you — your appointment is confirmed. See you then!
          </div>
        ) : null}
        {reschedule ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/5 p-4 text-sm font-semibold text-emerald">
            <CheckCircle2 className="h-5 w-5" />
            Got it — the office will reach out shortly to find a better time.
          </div>
        ) : null}

        <Panel>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">Service appointment</p>
          <h1 className="mt-2 text-2xl font-semibold">{job.title}</h1>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-emerald" />
              <span className="font-semibold">
                {dateOnly(job.scheduledDate)} <span className="font-normal text-muted">{window}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-emerald" />
              <span>{job.serviceAddress}</span>
            </div>
            {job.assignedToName ? (
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-emerald" />
                <span>Your technician: {job.assignedToName}</span>
              </div>
            ) : null}
          </div>

          {job.status !== "SCHEDULED" ? (
            <p className="mt-6 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">
              This appointment is no longer awaiting confirmation. Contact the office with any questions.
            </p>
          ) : job.confirmedAt ? (
            <div className="mt-6 flex items-center gap-2 rounded-lg bg-mist p-4 text-sm font-semibold text-emerald">
              <CheckCircle2 className="h-5 w-5" />
              Confirmed{job.confirmedByName ? ` by ${job.confirmedByName}` : ""} on {dateOnly(job.confirmedAt)}
            </div>
          ) : (
            <form action={`/api/portal/visits/${token}/confirm`} method="post" className="mt-6 space-y-3">
              <label className="block space-y-1 text-sm font-semibold">
                Your name <span className="font-normal text-muted">(optional)</span>
                <input
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                  name="confirmedByName"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald px-5 text-sm font-semibold text-white hover:bg-[#0b7d63]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm this appointment
              </button>
            </form>
          )}
        </Panel>

        {job.status === "SCHEDULED" ? (
          <Panel>
            <h2 className="text-lg font-semibold">Need a different time?</h2>
            <form action={`/api/portal/visits/${token}/reschedule`} method="post" className="mt-3 space-y-3">
              <textarea
                className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                name="notes"
                placeholder="Mornings work better for us, or any day next week..."
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-canvas"
              >
                <Send className="h-4 w-4" />
                Request a change
              </button>
            </form>
          </Panel>
        ) : null}

        <p className="text-center text-xs text-muted">
          Secure appointment link from {companyName}
          {organization?.licenseNumber ? ` - License #${organization.licenseNumber}` : ""}
        </p>
      </div>
      <ApexAxiomMark className="mx-auto max-w-2xl" />
    </main>
  );
}
