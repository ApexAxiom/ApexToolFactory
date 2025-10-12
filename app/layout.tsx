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
      <body className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-8 p-6">
          <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[color:var(--brand-primary-from)] to-[color:var(--brand-primary-to)] p-6 text-white shadow-soft">
            <div>
              <h1 className="text-2xl font-semibold">PestPro Quotations</h1>
              <p className="text-sm text-white/90">Deliver accurate proposals for every property type.</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-2 text-sm">Secure multi-tenant workspace</div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
