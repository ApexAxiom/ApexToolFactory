"use client";

import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Organization } from "@/domain/types";
import { cn } from "@/lib/utils";

const nav: Array<{ href: Route; label: string }> = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/quotes", label: "Quotes" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/team", label: "Team" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/billing", label: "Billing" }
];

export function AppShell({
  organization,
  userEmail,
  children
}: {
  organization: Organization | null;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-ink/10 bg-pine px-6 py-8 text-white lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-clay text-lg font-bold text-pine">
              P
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.32em] text-white/60">Pestimator</div>
              <div className="text-lg font-semibold">{organization?.name || "Workspace"}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm transition",
                    active ? "bg-white text-pine" : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action="/api/auth/logout" method="post" className="mt-10">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-white/50">Signed in</div>
            <div className="mb-4 text-sm text-white/90">{userEmail}</div>
            <button
              type="submit"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </aside>

        <main className="px-5 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
