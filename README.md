# PestPro Quotations

PestPro Quotations is a production-focused, server-rendered quoting tool for pest-control operators. The app runs on Next.js 14 (App Router) with Prisma ORM and a deterministic pricing engine that executes entirely on the server.

## Highlights
- Server-rendered HTML forms for login and quote creation (no SPA wizard state).
- Iron-session authentication with hardened cookies and per-request rate limiting on the login form.
- Prisma models scoped by `orgId` with composite uniques, transactional quote creation, and per-tenant quote number sequences.
- Deterministic pricing engine shared between the UI and persistence layer.
- JSON structured logs enriched with `x-request-id` from middleware for traceability.
- Liveness (`/healthz`) and readiness (`/readyz`) probes suitable for AWS App Runner.

## Getting Started
1. **Install prerequisites** – Node.js 20+ and pnpm 8+.
2. **Install dependencies**
   ```sh
   pnpm install
   ```
3. **Create your environment file**
   ```sh
   cp .env.example .env
   ```
   - For local SQLite, set `DATABASE_PROVIDER=sqlite` and `DATABASE_URL="file:./dev.db"`.
   - For Postgres, set `DATABASE_PROVIDER=postgresql` and a production-grade `DATABASE_URL`.
   - Always set `SESSION_PASSWORD` to a random 32+ character string.
4. **Generate the Prisma client and run migrations**
   ```sh
   # Postgres (production-style)
   pnpm prisma generate
   pnpm prisma migrate dev --name init

   # OR SQLite for local development
   pnpm prisma:generate:sqlite
   pnpm prisma:migrate:sqlite --name init
   ```
5. **Seed the database** (idempotent)
   ```sh
   pnpm seed
   ```
   The seed script prints the admin login (`admin@example.com` / `ChangeMe!2025`).
6. **Run the app locally**
   ```sh
   pnpm dev
   ```
   Visit `http://localhost:3000/login` and sign in with the seeded credentials.

## Scripts
- `pnpm dev` – Run the Next.js development server.
- `pnpm build` – Generate Prisma client, apply `migrate deploy`, and build the production bundle.
- `pnpm start` – Start Next.js in production mode (binds to `$PORT`).
- `pnpm lint` – ESLint using the Next.js configuration.
- `pnpm typecheck` – Strict TypeScript type checking.
- `pnpm test` – Vitest unit test suite.
- `pnpm seed` – Seed baseline data (safe to run repeatedly).

## Database & Multi-tenancy
- All Prisma models include an `orgId` column with composite uniques (`Customer`, `Property`, `ServiceTemplate`, `Quote`, etc.).
- Quote creation runs inside a transaction and calls `allocateQuoteNumber` to generate monotonic, per-org IDs (e.g., `Q20240401-0001`).
- `QuoteSequence` maintains the next serial per organization.
- Deleting customers or templates is restricted by foreign keys to avoid dangling references.

## Security & Guardrails
- Session cookies (`aa.sid`) are HttpOnly, SameSite=Lax, and secure in production.
- Login attempts are rate limited (defaults: 10 attempts per 5 minutes) and logged with structured metadata.
- `requireOrgId` enforces org scoping for every Prisma query invoked by server components and actions.
- Legacy API routes are disabled (HTTP 410) in favor of the new server-rendered workflows.

## Observability & Ops
- Middleware assigns/propagates `x-request-id` on every request. Use this value in logs when troubleshooting.
- `src/lib/log.ts` emits JSON logs with `level`, `msg`, and metadata. App Runner or CloudWatch can parse these directly.
- Health endpoints:
  - `GET /healthz` – liveness probe returning `ok`.
  - `GET /readyz` – readiness probe that pings the database (`SELECT 1`).
- Quote PDF generation is stubbed (`GET /quotes/:id/pdf` returns 204) with a TODO marker for future integration.

## Deployment Notes
- Managed runtime via `apprunner.yaml` (Node.js) is supported; ensure `$PORT` is honored.
- Provision secrets (e.g., `DATABASE_URL`, `SESSION_PASSWORD`) via AWS Secrets Manager and inject them into the runtime.
- Run the quality gate before merging or deploying:
  ```sh
  pnpm lint
  pnpm typecheck
  pnpm test
  ```
- Logs emitted by Next.js/Node flow to App Runner’s CloudWatch group; filter by `requestId` for traceability.

## Rollback
Refer to [docs/rollback.md](docs/rollback.md) for step-by-step rollback procedures.
