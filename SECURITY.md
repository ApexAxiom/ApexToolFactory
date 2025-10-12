# Security Policy

## Password Requirements
- Minimum 12 characters
- Must include uppercase, lowercase, number, and symbol
- Reject compromised passwords using haveibeenpwned style service during signup (stubbed locally)

## Tenant Isolation
- Every request resolves the authenticated session and enforces `organizationId` scoping.
- Prisma client extensions validate tenant ownership for reads and writes.
- S3 keys are namespaced with the organization ID to avoid cross-tenant leakage.

## Reporting
Send vulnerability reports to `security@example.com`. Provide reproduction steps and impact estimate. We aim to respond within two business days.

## Hardening Checklist
- HTTPS enforced via CloudFront/App Runner.
- Secrets stored in AWS Secrets Manager and injected at runtime.
- `/healthz` exposes minimal data and is unauthenticated.
