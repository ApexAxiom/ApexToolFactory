"use client";

import { FormEvent, useState, useTransition } from "react";

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          companyName,
          displayName,
          email,
          password,
          confirmationCode: confirmationCode || undefined
        })
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        requiresConfirmation?: boolean;
        redirectTo?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error || "Signup failed");
        return;
      }

      if (payload.requiresConfirmation) {
        setNeedsConfirmation(true);
        return;
      }

      window.location.href = payload.redirectTo || "/login";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Company
        </label>
        <input
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Downtown Pest Control"
          required
          disabled={needsConfirmation}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Your name
        </label>
        <input
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="John Davis"
          disabled={needsConfirmation}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Work email
        </label>
        <input
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@company.com"
          type="email"
          autoComplete="email"
          required
          disabled={needsConfirmation}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Password
        </label>
        <input
          className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a strong password"
          type="password"
          autoComplete="new-password"
          required
          disabled={needsConfirmation}
        />
      </div>
      {needsConfirmation ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            Email confirmation code
          </label>
          <input
            className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald"
            value={confirmationCode}
            onChange={(event) => setConfirmationCode(event.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        disabled={isPending}
        className="w-full rounded-md bg-emerald px-5 py-3 font-semibold text-white transition hover:bg-[#0b7d63] disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
      >
        {isPending ? "Working..." : needsConfirmation ? "Confirm account" : "Start free trial"}
      </button>
    </form>
  );
}
