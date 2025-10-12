import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const features = [
  {
    title: 'Purpose-built for pest pros',
    description:
      'Quote treatments for mosquitoes, termites, bed bugs, and more with service templates that capture time, travel, and chemical usage.',
  },
  {
    title: 'Consistent, profitable pricing',
    description:
      'Dial in your margin, labor rates, and route adjustments so every proposal hits the targets your technicians and sales team rely on.',
  },
  {
    title: 'Ready to send proposals',
    description:
      'Instantly generate polished PDF quotes and track status from draft through won deals without leaving the workspace.',
  },
];

const steps = [
  {
    title: '1. Pick the customer & property',
    description: 'Search your customer list and pull in the property details you saved from the field.',
  },
  {
    title: '2. Choose the treatment template',
    description: 'Start from presets that include labor, materials, travel, and tax for each pest scenario.',
  },
  {
    title: '3. Review & share the quote',
    description: 'Fine-tune scope, confirm totals, and deliver a professional document in minutes.',
  },
];

const heroSecondaryButton =
  'rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring focus-visible:ring-white/60';

const neutralSecondaryButton =
  'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2';

const ctaLinks = [
  { href: '/quotes/new', label: 'Create a pest control quote', style: 'gradient-button' },
  { href: '/services', label: 'Manage service templates', style: heroSecondaryButton },
  { href: '/customers', label: 'View customers', style: heroSecondaryButton },
];

export default function WelcomePage() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[color:var(--brand-primary-from)]/95 via-[color:var(--brand-primary-to)]/90 to-sky-500/80 p-10 text-white shadow-soft">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl space-y-6 text-center">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-wide">Pestimator</span>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Welcome to your pest control quoting command center
          </h1>
          <p className="text-base text-slate-100 md:text-lg">
            Build fast, accurate quotes that factor in chemicals, crew time, and travel so you win more jobs—and protect your
            margins on every route.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ctaLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.style}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-10">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">{feature.title}</h2>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </Card>
          ))}
        </div>

        <Card className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">How quoting works</h2>
            <p className="text-sm text-slate-600">
              Follow the guided workflow to turn job notes into a client-ready proposal without spreadsheets.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-2xl bg-slate-50/70 p-5 text-left shadow-inner">
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-900/90 p-6 text-center text-slate-100 md:flex-row md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Need a jumping-off point?</h3>
              <p className="text-sm text-slate-200">
                Load a preset, tweak margins, and see costs update instantly before you send the quote.
              </p>
            </div>
            <Link href="/quotes/new" className="gradient-button">
              Start a new quote
            </Link>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-5xl">
        <Card className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Why teams switch to Pestimator</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">Fewer callbacks:</span> capture interior and exterior scope so technicians arrive ready.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Route-aware travel:</span> include drive time, fuel, and fees without manual math.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Chemical accountability:</span> convert usage rates into costs automatically to protect profitability.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-700">
            <h3 className="text-lg font-semibold text-slate-900">What&apos;s next?</h3>
            <p className="mt-2">
              Explore your customers, build service templates for seasonal programs, and invite your sales reps so everyone can
              quote the same way.
            </p>
            <div className="mt-4 space-y-2">
              <Link href="/team" className={`${neutralSecondaryButton} block text-center`}>
                Invite teammates
              </Link>
              <Link href="/properties" className={`${neutralSecondaryButton} block text-center`}>
                Organize customer properties
              </Link>
              <Link href="/settings" className={`${neutralSecondaryButton} block text-center`}>
                Configure company settings
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
