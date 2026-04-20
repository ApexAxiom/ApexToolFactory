import Link from "next/link";

const sellingPoints = [
  "Create customers and service properties fast",
  "Build quotes with photos and margin-safe pricing",
  "Send branded quote and invoice emails",
  "Let customers approve and pay from secure links"
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-ink/10 bg-pine px-8 py-10 text-white shadow-panel sm:px-12 sm:py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.32em] text-white/55">Pestimator</div>
            <div className="mt-2 max-w-xl text-sm text-white/70">
              Sales and office software for pest control operators who need quotes, invoices, approvals, and follow-up in one place.
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="max-w-3xl font-[var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
              The office hub a pest company owner actually wants to use.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/76">
              Pestimator turns inspections into customer-ready quotes, accepted work into invoices, and owner guesswork into a clean operating system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-gold to-clay px-6 py-3 text-sm font-semibold text-pine transition hover:brightness-105"
              >
                Open workspace
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                View product
              </a>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6">
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-white/55">Built for daily use</div>
            <div className="space-y-3">
              {sellingPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/90">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto mt-10 max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Office-first workflow",
              body: "Customers, properties, quotes, invoices, and reminders are structured around the way a small office actually works."
            },
            {
              title: "Secure customer portal",
              body: "Customers review quotes from a private link, accept them with a typed signature trail, and move to payment without calling the office."
            },
            {
              title: "AWS-native delivery",
              body: "Cognito, SES, S3, DynamoDB, and Stripe-backed billing keep the stack deployable and production-oriented."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-[1.75rem] border border-ink/10 bg-white p-6 shadow-panel">
              <div className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-ink/45">Feature</div>
              <h2 className="font-[var(--font-display)] text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-ink/72">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
