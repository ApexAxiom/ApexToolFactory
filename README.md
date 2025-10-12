# PestPro Quotations

PestPro Quotations is a multi-tenant SaaS platform that empowers pest-control companies to build accurate proposals for residential and commercial properties. The stack is designed for deterministic pricing, tenant isolation, and AWS App Runner readiness.

## Features
- Next.js 14 App Router with Tailwind CSS UI and accessible design system
- Iron-session authentication with role-based access (Owner, Manager, Estimator, Viewer)
- Prisma ORM with SQLite (dev) and Aurora PostgreSQL (prod) support
- Deterministic pricing engine with tier rules, materials, labor, travel, and rounding controls
- PDF generation via pdfkit and email previews with Nodemailer
- AWS CDK stacks for App Runner and Amplify Hosting options
- Vitest unit tests for pricing formulas and utilities

## Getting Started
1. Install prerequisites: Node.js 20+, pnpm 8+
2. Install dependencies:
   ```sh
   pnpm install
   ```
3. Configure environment:
   ```sh
   cp .env.example .env
   ```
   Update `SESSION_PASSWORD` and AWS placeholders as needed.
4. Generate Prisma client and apply migrations:
   ```sh
   pnpm prisma:generate
   pnpm prisma:migrate dev --name init
   pnpm prisma:seed
   ```
5. Run the app locally:
   ```sh
   pnpm dev
   ```
6. Log in with seeded credentials: `admin@example.com` / `Password123!`

## Scripts
- `pnpm dev` – Run Next.js locally
- `pnpm build` – Build the production bundle
- `pnpm start` – Start the production server (binds to `$PORT`)
- `pnpm lint` – ESLint with Next.js configuration
- `pnpm typecheck` – Strict TypeScript compilation
- `pnpm test` – Vitest unit tests
- `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm prisma:seed` – Database workflows
- `pnpm infra:cdk:bootstrap`, `pnpm infra:cdk:deploy:apprunner`, `pnpm infra:cdk:deploy:amplify` – AWS CDK utilities

## Size Gate
Binary files or assets over 500 KB must use Git LFS. Configure a safety threshold:
```sh
git config core.bigFileThreshold 500k
```
CI includes a size check to block large files.

## Testing
Run the full quality gate before merging:
```sh
pnpm lint
pnpm typecheck
pnpm test
```

## AWS Deployment
1. Bootstrap CDK environment: `pnpm infra:cdk:bootstrap`
2. Deploy App Runner stack (container-first): `pnpm infra:cdk:deploy:apprunner`
3. Alternatively deploy Amplify Hosting: `pnpm infra:cdk:deploy:amplify`
4. Populate Secrets Manager with `DATABASE_URL`, `SESSION_PASSWORD`, and `ASSET_BUCKET`
5. App Runner health checks use `GET /healthz`

App Runner reads `apprunner.yaml` to install, build, and run `pnpm start` on port 8080.

### AWS App Runner ("Agility" server) readiness
- The `infra/cdk/lib/apprunner-stack.ts` stack provisions an App Runner service with a VPC connector to private Aurora subnets and injects `DATABASE_URL` from Secrets Manager, so no public database exposure is required.
- `apprunner.yaml` targets the Node.js managed runtime, installs with `pnpm`, and starts the server on `$PORT`/`0.0.0.0`, matching App Runner’s expectations.
- Health checks are configured against `/healthz`, and storage writes (PDFs, logos) are prefixed by `organizationId/…` in S3, maintaining tenant isolation.
- To deploy into another AWS environment (for example, an “Agility” sandbox), point the CDK context at that account/region, ensure Secrets Manager contains the required secrets, and redeploy the App Runner stack—no code changes are needed.

## Observability
- `/healthz` returns `{ ok: true }` for uptime checks.
- Application logs flow to App Runner CloudWatch logs. Include pricing snapshot IDs for debugging quotes.

## Rollback
See [docs/rollback.md](docs/rollback.md) for the rollback procedure.
