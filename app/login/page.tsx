import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="grid w-full max-w-5xl gap-8 overflow-hidden rounded-[2rem] border border-ink/10 bg-pine shadow-panel lg:grid-cols-[1fr_420px]">
        <section className="px-8 py-10 text-white sm:px-12">
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-white/55">Pestimator Login</div>
          <h1 className="mt-5 max-w-xl font-[var(--font-display)] text-4xl font-semibold leading-tight">
            Sign in to the office hub for quotes, invoices, approvals, and billing.
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/76">
            Production access uses Cognito-backed email sign-in and MFA. There is no local demo mode in this app.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              "Verified email identity",
              "MFA-capable authentication flow",
              "HttpOnly session cookie",
              "Server-enforced organization access"
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/90">
                {item}
              </div>
            ))}
          </div>
          <Link href="/" className="mt-10 inline-block text-sm text-white/70 underline underline-offset-4">
            Back to marketing site
          </Link>
        </section>

        <section className="border-t border-white/10 bg-white/6 px-8 py-10 lg:border-l lg:border-t-0">
          <div className="mb-6">
            <div className="font-[var(--font-display)] text-2xl font-semibold text-white">Welcome back</div>
            <p className="mt-2 text-sm text-white/65">Use your verified work email and password to continue.</p>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
