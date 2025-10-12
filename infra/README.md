# Infrastructure Overview

This repository ships two AWS CDK stacks:

1. **AppRunnerStack** – Provisions an S3 bucket for tenant assets, a Secrets Manager secret for the database URL, and an AWS App Runner service configured to read from GitHub using `apprunner.yaml`. Health checks target `/healthz` to satisfy App Runner guardrails.
2. **AmplifyStack** – Creates an Amplify Hosting application with a secure artifact bucket and role bindings. Deployments execute `pnpm install` and `pnpm build` before uploading `.next` artifacts for SSR hosting.

Select the deployment approach that matches your operational needs. App Runner suits container-first workflows, while Amplify handles SSR builds with built-in CI.

## Usage

```sh
pnpm install
pnpm infra:cdk:bootstrap
pnpm infra:cdk:deploy:apprunner # or :deploy:amplify
```

Configure Secrets Manager entries (DATABASE_URL, SESSION_PASSWORD, ASSET_BUCKET) before promoting to production.
