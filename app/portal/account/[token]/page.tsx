import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, CreditCard, MapPin, Send, UserRound } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { currency, dateOnly } from "@/lib/utils";
import { getRequestIp, getUserAgent } from "@/server/http/request-meta";
import { getCustomerPortalView } from "@/server/services/customer-portal";
import { effectiveInvoiceStatus } from "@/server/services/invoices";

const inputClass =
  "h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10";

export default async function CustomerPortalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ requested?: string }>;
}) {
  const { token } = await params;
  const { requested } = await searchParams;
  const requestHeaders = await headers();
  const view = await getCustomerPortalView({
    token,
    ip: getRequestIp(requestHeaders),
    userAgent: getUserAgent(requestHeaders)
  }).catch(() => null);
  if (!view) notFound();

  const { customer, organization, upcomingJobs, pendingRequests, completedJobs, openInvoices } = view;
  const companyName = organization?.name ?? "Your service provider";

  return (
    <main className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-ink">{companyName}</div>
            <div className="text-sm text-muted">
              {[organization?.supportPhone, organization?.supportEmail].filter(Boolean).join(" | ") ||
                "Customer service portal"}
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
            <UserRound className="h-4 w-4" />
            {customer.name}
          </span>
        </div>

        {requested ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald/5 p-4 text-sm font-semibold text-emerald">
            <CheckCircle2 className="h-5 w-5" />
            Your visit request was received — the office will reach out to confirm a date.
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Panel>
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald" />
                <h2 className="text-lg font-semibold">Upcoming visits</h2>
              </div>
              <div className="space-y-2">
                {upcomingJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{job.title}</div>
                      <StatusPill status={job.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <span>
                        {dateOnly(job.scheduledDate)}
                        {job.scheduledStartTime ? ` at ${job.scheduledStartTime}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.serviceAddress}
                      </span>
                      {job.assignedToName ? <span>Technician: {job.assignedToName}</span> : null}
                    </div>
                  </div>
                ))}
                {pendingRequests.map((job) => (
                  <div key={job.id} className="rounded-lg border border-dashed border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{job.title}</div>
                      <span className="text-xs font-semibold text-muted">Awaiting scheduling</span>
                    </div>
                  </div>
                ))}
                {upcomingJobs.length === 0 && pendingRequests.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                    No visits scheduled. Use the request form to book one.
                  </p>
                ) : null}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-4 text-lg font-semibold">Service history</h2>
              <div className="space-y-2">
                {completedJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{job.title}</div>
                      <span className="text-sm text-muted">{dateOnly(job.completedAt)}</span>
                    </div>
                    {job.completionNotes ? (
                      <p className="mt-2 text-sm leading-6 text-muted">{job.completionNotes}</p>
                    ) : null}
                  </div>
                ))}
                {completedJobs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                    Completed visits and their service reports will appear here.
                  </p>
                ) : null}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel>
              <h2 className="text-lg font-semibold">Request a visit</h2>
              <p className="mt-1 text-sm text-muted">
                Seeing activity, or due for a service? Let the office know.
              </p>
              <form action={`/api/portal/account/${token}/request-visit`} method="post" className="mt-4 grid gap-3">
                <label className="space-y-1 text-sm font-semibold">
                  Preferred date <span className="font-normal text-muted">(optional)</span>
                  <input className={inputClass} type="date" name="preferredDate" />
                </label>
                <label className="space-y-1 text-sm font-semibold">
                  What are you seeing?
                  <textarea
                    className="min-h-20 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/10"
                    name="notes"
                    placeholder="Ants in the kitchen, possible wasp nest near the loading dock..."
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald px-4 text-sm font-semibold text-white hover:bg-[#0b7d63]"
                >
                  <Send className="h-4 w-4" />
                  Send request
                </button>
              </form>
            </Panel>

            <Panel>
              <h2 className="mb-4 text-lg font-semibold">Open invoices</h2>
              <div className="space-y-2">
                {openInvoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{invoice.invoiceNumber}</div>
                      <StatusPill status={effectiveInvoiceStatus(invoice)} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted">Due {dateOnly(invoice.dueDate)}</span>
                      <span className="font-semibold">{currency(invoice.outstandingTotal)}</span>
                    </div>
                    {invoice.stripeHostedInvoiceUrl ? (
                      <a
                        href={invoice.stripeHostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-emerald px-3 text-sm font-semibold text-white hover:bg-[#0b7d63]"
                      >
                        <CreditCard className="h-4 w-4" />
                        Pay online
                      </a>
                    ) : null}
                  </div>
                ))}
                {openInvoices.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
                    You are all paid up. Thank you!
                  </p>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>

        <p className="text-center text-xs text-muted">
          Secure portal provided by {companyName}
          {organization?.licenseNumber ? ` - License #${organization.licenseNumber}` : ""}
        </p>
      </div>
    </main>
  );
}
