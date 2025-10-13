import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'PestPro Quotations',
  description: 'Multi-tenant pest-control quoting platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 pb-20">
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 sm:space-y-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-[var(--brand-primary-from)] to-[var(--brand-primary-to)] p-4 sm:p-6 text-white shadow-soft">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">PestPro Quotations</h1>
              <p className="text-sm text-white/90">Deliver accurate proposals for every property type.</p>
            </div>
            <div className="rounded-xl bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm whitespace-nowrap">Secure multi-tenant workspace</div>
          </header>
          <main className="pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
