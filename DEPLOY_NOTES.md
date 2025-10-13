# DB-first Quote Wizard (No Demo Data)

- `/api/quotes/bootstrap` seeds minimal org defaults on first authenticated hit via `ensureOrgDefaults()`, then returns **real DB data**.
- Step-1 "Next" creates Customer/Property/Template when missing through `/api/quotes/ensure-entities`.
- All demo fallbacks removed in production.

## Amplify SSR
- Use Next.js SSR on Amplify; static hosting will break `/api/*`.
- Required env vars:
  - `DATABASE_URL`
  - `SESSION_PASSWORD`
- Build runs: `prisma generate`, `prisma migrate deploy`, `next build`.
