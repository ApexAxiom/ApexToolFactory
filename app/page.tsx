import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  FileText,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TableProperties
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/ui/brand";

const metrics = [
  { icon: ShieldCheck, value: "10,000+", label: "Pest control pros trust Pestimator" },
  { icon: FileText, value: "1M+", label: "Quotes and invoices generated" },
  { icon: Clock3, value: "6 min", label: "Median quote creation time" },
  { icon: DollarSign, value: "28%", label: "Average lift in close rate" },
  { icon: Star, value: "4.9/5", label: "Average rating from users" }
];

const features = [
  {
    icon: FileText,
    title: "Smart quote builder",
    body: "Build accurate quotes fast with built-in pricing, scopes, and coverage options."
  },
  {
    icon: Sparkles,
    title: "Recurring service pricing",
    body: "Price quarterly, monthly, or one-time services with custom tiers."
  },
  {
    icon: TableProperties,
    title: "Professional templates",
    body: "Send polished proposals that reflect your brand and win more jobs."
  },
  {
    icon: DollarSign,
    title: "Invoicing and follow-up",
    body: "Convert quotes to invoices and collect faster with hosted payment links."
  }
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <BrandMark />
          <nav className="hidden items-center gap-9 text-sm font-semibold text-ink/80 md:flex">
            <a href="#product" className="inline-flex items-center gap-1 hover:text-emerald">
              Product <ChevronDown className="h-4 w-4" />
            </a>
            <a href="#workflow" className="hover:text-emerald">Workflow</a>
            <a href="#pricing" className="hover:text-emerald">Pricing</a>
            <a href="#templates" className="hover:text-emerald">Templates</a>
            <a href="#resources" className="inline-flex items-center gap-1 hover:text-emerald">
              Resources <ChevronDown className="h-4 w-4" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-ink hover:text-emerald sm:inline">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-md bg-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-[#0b7d63]">
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-20">
        <div>
          <Badge tone="success" className="mb-6 uppercase tracking-[0.18em]">
            Built for pest control professionals
          </Badge>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] text-ink sm:text-6xl">
            Create polished quotes and invoices in <span className="text-emerald">minutes</span>, not hours.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Pestimator helps pest control businesses deliver professional proposals, set pricing with confidence, and get paid faster. All in one purpose-built platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-md bg-emerald px-7 py-4 text-sm font-semibold text-white hover:bg-[#0b7d63]">
              Start free trial
            </Link>
            <Link href="#product" className="rounded-md border border-emerald px-7 py-4 text-sm font-semibold text-emerald hover:bg-mist">
              View sample proposal
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
            {["14-day free trial", "No credit card required", "Cancel anytime"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroMockup />
      </section>

      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 md:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.value} className="flex items-center gap-4 border-line xl:border-r xl:last:border-r-0">
              <metric.icon className="h-10 w-10 text-emerald" strokeWidth={1.5} />
              <div>
                <div className="text-2xl font-semibold text-ink">{metric.value}</div>
                <div className="max-w-36 text-sm leading-5 text-muted">{metric.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-line bg-white p-5 shadow-subtle">
              <feature.icon className="mb-4 h-10 w-10 text-emerald" strokeWidth={1.5} />
              <h2 className="text-lg font-semibold text-ink">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 text-center sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald">Built for your workflow</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink">From quote to cash in three simple steps</h2>
          <div className="mx-auto mt-8 grid max-w-5xl gap-6 text-left md:grid-cols-3">
            {[
              ["1", "Create", "Build a quote in minutes with guided inputs and smart pricing."],
              ["2", "Send", "Share a professional proposal your customers will trust."],
              ["3", "Close and collect", "Win the job, convert to invoice, and get paid faster."]
            ].map(([number, title, body], index) => (
              <div key={number} className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mist text-lg font-semibold text-emerald">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
                </div>
                {index < 2 ? <ArrowRight className="ml-auto hidden h-5 w-5 text-muted md:block" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald">Run your business</p>
            <h2 className="mt-4 text-3xl font-semibold text-ink">
              Everything you need to run a more profitable operation
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Stay organized, track performance, and manage every quote and invoice from a clean, easy-to-use dashboard.
            </p>
          </div>
          <DashboardPreview />
        </div>
      </section>
    </main>
  );
}

function HeroMockup() {
  return (
    <div className="rounded-lg border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-canvas text-muted">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Quote Q-1024</span>
              <Badge tone="success">Draft</Badge>
            </div>
            <p className="text-sm text-muted">Downtown Office Building</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold">Edit</button>
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald px-4 py-2 text-sm font-semibold text-white">
            <Send className="h-4 w-4" /> Send quote
          </button>
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[0.65fr_1fr]">
        <div className="rounded-lg border border-line p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Quote overview</h3>
            <span className="text-xs text-muted">Projected</span>
          </div>
          {[
            ["Quote total", "$712.00"],
            ["Service", "Quarterly general pest control"],
            ["Property", "12,500 sq ft - Commercial"],
            ["Frequency", "Quarterly"],
            ["Valid until", "June 13, 2025"]
          ].map(([label, value]) => (
            <div key={label} className="mb-3">
              <div className="text-xs text-muted">{label}</div>
              <div className="text-sm font-semibold text-ink">{value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-line p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Proposal preview</h3>
            <button className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted">Download PDF</button>
          </div>
          <div className="rounded-md border border-line bg-white p-5">
            <BrandMark className="mb-6 text-sm" />
            <h4 className="text-2xl font-semibold text-ink">Pest Management Proposal</h4>
            <p className="mt-2 text-sm text-muted">Prepared for Acme Property Group</p>
            <div className="my-5 h-px bg-line" />
            <p className="text-sm font-semibold">Our approach</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              A proactive, science-based program designed to prevent pest activity and protect your property year-round.
            </p>
            <div className="mt-5 grid gap-3 text-xs text-muted sm:grid-cols-3">
              {["Thorough inspections", "Targeted treatments", "Ongoing monitoring"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald" /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div className="grid min-h-80 lg:grid-cols-[190px_1fr]">
        <aside className="hidden bg-pine p-5 text-white lg:block">
          <BrandMark dark className="mb-6" />
          {["Dashboard", "Quotes", "Invoices", "Clients", "Templates"].map((item, index) => (
            <div key={item} className={`mb-2 rounded-md px-3 py-2 text-sm ${index === 0 ? "bg-white/10" : "text-white/70"}`}>
              {item}
            </div>
          ))}
        </aside>
        <div className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Dashboard</h3>
            <button className="rounded-md bg-emerald px-4 py-2 text-sm font-semibold text-white">New quote</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ["Quotes sent", "128", "+18%"],
              ["Win rate", "42%", "+8%"],
              ["Revenue", "$24,680", "+22%"],
              ["Avg. time", "6 min", "+14%"]
            ].map(([label, value, delta]) => (
              <div key={label} className="rounded-lg border border-line p-4">
                <div className="text-sm text-muted">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
                <div className="mt-2 text-xs font-semibold text-emerald">{delta} vs last month</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Recent activity</span>
              <span className="text-sm font-semibold text-emerald">View all</span>
            </div>
            <div className="space-y-3">
              {["Q-1024 sent to Downtown Office Building", "Invoice INV-2041 paid", "Quote Q-1023 accepted"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-md bg-canvas px-3 py-2 text-sm">
                  <span>{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
