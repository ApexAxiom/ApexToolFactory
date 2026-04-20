"use client";

import { FormEvent, useState, useTransition } from "react";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [challengeName, setChallengeName] = useState<string | null>(null);
  const [challengeSession, setChallengeSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          mfaCode: mfaCode || undefined,
          challengeName: challengeName || undefined,
          challengeSession: challengeSession || undefined
        })
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        requiresMfa?: boolean;
        challengeName?: string;
        challengeSession?: string;
        redirectTo?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error || "Sign-in failed");
        return;
      }

      if (payload.requiresMfa) {
        setChallengeName(payload.challengeName || "SOFTWARE_TOKEN_MFA");
        setChallengeSession(payload.challengeSession || null);
        return;
      }

      window.location.href = payload.redirectTo || "/app/dashboard";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Work email
        </label>
        <input
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-gold"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@company.com"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Password
        </label>
        <input
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-gold"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {challengeName ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            Authenticator code
          </label>
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-gold"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <p className="mt-2 text-sm text-white/60">
            Enter the {challengeName === "SOFTWARE_TOKEN_MFA" ? "TOTP" : "verification"} code to finish sign-in.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-gold to-clay px-5 py-3 font-semibold text-pine transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
      >
        {isPending ? "Signing in..." : challengeName ? "Verify and continue" : "Sign in"}
      </button>
    </form>
  );
}
