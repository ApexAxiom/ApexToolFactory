"use client";

import Link from "next/link";
import type { Route } from "next";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import { Organization, Subscription } from "@/domain/types";
import { cn, dateOnly } from "@/lib/utils";
import { BrandMark } from "@/components/ui/brand";

const nav: Array<{ href: Route; label: string; icon: typeof LayoutDashboard }> = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/app/customers", label: "Clients", icon: Users },
  { href: "/app/quotes", label: "Quotes", icon: FileText },
  { href: "/app/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/app/team", label: "Team", icon: Wrench },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/billing", label: "Billing", icon: CreditCard }
];

const pageMeta: Array<{ match: string; title: string; description: string }> = [
  { match: "/app/quotes/new", title: "Quote Builder", description: "Create and send professional proposals in minutes." },
  { match: "/app/quotes", title: "Quotes", description: "Manage drafts, sent proposals, and accepted work." },
  { match: "/app/schedule", title: "Schedule", description: "Book visits, assign technicians, and manage the service calendar." },
  { match: "/app/jobs", title: "Job", description: "Track the visit from booking through the completed service report." },
  { match: "/app/customers", title: "Clients", description: "Track commercial accounts, contacts, and properties." },
  { match: "/app/invoices", title: "Invoices", description: "Convert accepted work into invoices and collect payments." },
  { match: "/app/team", title: "Team", description: "Invite operators and manage workspace access." },
  { match: "/app/settings", title: "Settings", description: "Configure your company, tax, and production setup." },
  { match: "/app/billing", title: "Billing", description: "Review plan status, trial timing, and payment setup." },
  { match: "/app/dashboard", title: "Dashboard", description: "Monitor quote volume, win rate, revenue, and follow-up." }
];

export function AppShell({
  organization,
  subscription,
  userEmail,
  children
}: {
  organization: Organization | null;
  subscription: Subscription | null;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const meta = pageMeta.find((item) => pathname.startsWith(item.match)) || pageMeta[pageMeta.length - 1];
  const initials = useMemo(() => {
    const seed = userEmail.split("@")[0] || "User";
    return seed
      .split(/[._-]+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [userEmail]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="border-b border-white/10 bg-pine px-4 py-4 text-white xl:fixed xl:inset-y-0 xl:left-0 xl:w-64 xl:border-b-0 xl:py-5">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:block xl:max-w-none">
          <div className="flex items-center justify-between gap-4 xl:mb-8 xl:block xl:px-1">
            <BrandMark dark />
            <form action="/api/auth/logout" method="post" className="xl:hidden">
              <button className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-semibold text-white/78 hover:bg-white/[0.07] hover:text-white">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>

          <nav className="flex gap-1 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition xl:h-11 xl:gap-3",
                    active
                      ? "bg-white/10 text-white shadow-[inset_3px_0_0_#0f8f72]"
                      : "text-white/72 hover:bg-white/[0.07] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 xl:h-5 xl:w-5" strokeWidth={1.8} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {subscription ? (
            <div className="hidden rounded-lg border border-white/12 bg-white/[0.03] p-4 xl:mt-10 xl:block">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald" />
                <span className="text-sm font-semibold capitalize">{subscription.plan} plan</span>
              </div>
              <p className="text-sm text-white/70">
                {subscription.status === "TRIALING" && subscription.currentPeriodEnd
                  ? `Trial ends ${dateOnly(subscription.currentPeriodEnd)}`
                  : subscription.status.replace(/_/g, " ").toLowerCase()}
              </p>
              <Link
                href="/app/billing"
                className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4"
              >
                View plan
              </Link>
            </div>
          ) : null}

          <form action="/api/auth/logout" method="post" className="hidden xl:mt-6 xl:block">
            <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/72 hover:bg-white/[0.07] hover:text-white">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 xl:ml-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-20 max-w-[1600px] flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">{meta?.title}</h1>
              <p className="mt-1 text-sm text-muted">{meta?.description}</p>
            </div>
            <div className="flex w-full min-w-0 items-center justify-end gap-3 lg:w-auto">
              <div className="flex items-center gap-3 border-l border-line pl-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald text-sm font-bold text-white">
                  {initials || "JD"}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold">{userEmail}</div>
                  <div className="text-xs text-muted">{organization?.name || "Workspace setup"}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
