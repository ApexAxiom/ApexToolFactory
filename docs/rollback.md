# Rollback Guide

If a deployment introduces regressions, follow these steps to recover quickly:

1. **Identify the failing release** – Use App Runner deployment history or Git tags to determine the problematic version.
2. **Revert in Git** – Create a revert commit targeting the offending merge. Push to `main` to trigger App Runner rollback deployment.
3. **Redeploy previous container** – In the App Runner console choose the last healthy deployment and redeploy while the revert builds.
4. **Database restore** – If schema changes broke production, promote the latest snapshot in Amazon Aurora PostgreSQL. Re-run `prisma migrate deploy` against the restored instance.
5. **Communicate** – Notify affected tenants through email and the in-app banner. Include outage timeline, mitigation, and remediation plan.
6. **Postmortem** – File an incident report within 24 hours covering root cause, blast radius, detection, and follow-up actions.

Always validate rollback success via `/healthz` and a full smoke test before closing the incident.
