# Pest Estimator

A minimal Next.js 14 + Tailwind web app deployed via AWS Amplify Hosting for creating and tracking pest control quotes. Data persistence uses S3 as a JSON document store—no traditional database required.

## S3 document layout
All data lives under a per-organization prefix:

```
orgs/{orgId}/
  meta.json            # serial counters and metadata
  index.json           # list of recent quotes for fast dashboards
  customers/{id}.json  # individual customer records
  properties/{id}.json # individual property records
  templates/{id}.json  # service template definitions
  quotes/{id}.json     # saved quotes and line items
```

## Required environment variables
Set these values in Amplify (App settings → Environment variables) and in your local `.env` file for development:

| Name | Description |
| --- | --- |
| `NODE_ENV` | Usually `production` in Amplify. |
| `AWS_REGION` | AWS region of the S3 bucket (e.g. `us-east-1`). |
| `S3_BUCKET` | Name of the S3 bucket used for JSON storage. |
| `ADMIN_PASSPHRASE` | Shared secret required to log in via `/login`. |
| `SESSION_PASSWORD` | 32+ character password for iron-session encryption. |
| `ALLOWED_ORGS` | Comma separated list of allowed organization identifiers. |

Duplicate `.env.example` locally: `cp .env.example .env`.

## Least-privilege IAM policy
Grant the Amplify service role permissions scoped to the bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::${S3_BUCKET}"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${S3_BUCKET}/*"
    }
  ]
}
```

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The dev server runs on `http://localhost:3000`.

## Testing & quality gates
Run the required checks before committing:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

To avoid committing large binaries (>500 KB), configure Git with the suggested size gate:

```bash
git config hooks.pre-commit.command "scripts/prevent-large-files.sh"
```

See `.gitattributes` for enforced patterns.

## Deployment
Push to the tracked branch (e.g. `reset/pestimator-s3` or `main`) and Amplify Hosting builds with the included `amplify.yml`. For AWS App Runner environments, reuse the provided `apprunner.yaml`.

## Health check
The app responds to `GET /healthz` with `200 OK` once the server is running.

## Rollback
Refer to `docs/rollback.md` for rollback steps when reverting deployments.
