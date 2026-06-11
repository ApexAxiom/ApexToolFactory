# Pestimator Production Deployment Runbook

Step-by-step guide to take Pestimator from this repository to a live production
system on AWS. Budget roughly half a day for the first deploy; most of the
elapsed time is waiting on AWS verifications.

## Prerequisites

- An AWS account with admin access (separate from any personal projects).
- A Stripe account (activated for live payments).
- A domain name for the app (e.g. `app.yourcompany.com`) plus the company's
  email domain for sending (e.g. `yourcompany.com`).
- This repository pushed to GitHub.

---

## 1. Deploy the Amplify Gen 2 app

1. In the AWS console open **Amplify** → **Create new app** → **GitHub**, and
   pick this repository and the `main` branch. When prompted, let Amplify
   create (or reuse) the **service role** it needs for backend deployments.
2. Amplify detects `amplify.yml` automatically; the SSR build is already
   configured there.
3. The first deploy also provisions the backend (`amplify/backend.ts`):
   Cognito user pool, all DynamoDB tables (including `Job`, `ServicePlan`,
   and `WebhookEvent`), and the S3 attachments bucket. During the frontend
   build, `scripts/write-runtime-env.mjs` copies the generated table names
   and bucket into `.env.production` automatically — you do not need to set
   the `TABLE_*` env vars by hand.
4. Under **App settings → Domain management**, attach your domain
   (`app.yourcompany.com`). Note the final HTTPS URL — it is your `APP_URL`.

### 1b. Grant the SSR compute role its permissions (required)

The server talks to DynamoDB, SES, and S3 directly, so the Amplify Hosting
compute role must allow it:

1. In **IAM → Policies → Create policy → JSON**, paste
   `deploy/amplify-compute-policy.json` from this repo, replacing `REGION`,
   `ACCOUNT_ID`, and `ATTACHMENTS_BUCKET_NAME` (find the bucket name in the
   Amplify build logs or `amplify_outputs.json` under
   `custom.storage.attachmentsBucket`). Name it `pestimator-ssr-compute`.
2. In **IAM → Roles → Create role**, choose **Custom trust policy** and allow
   `amplify.amazonaws.com` to assume it, then attach the policy above.
3. In **Amplify → App settings → IAM roles → Compute role**, select the new
   role and redeploy.

Skipping this is the most common cause of a deployed app that loads the
login page but 500s on everything else.

## 2. Configure Cognito

1. Open **Amazon Cognito** → the user pool Amplify created.
2. Confirm the app client allows the `USER_PASSWORD_AUTH` flow.
3. Under **Sign-in experience**, require MFA and enable **Authenticator apps
   (TOTP)** — the app's login flow walks users through TOTP setup.
4. Copy the **User pool ID** and the **App client ID** for step 5.

## 3. Set up SES (email)

1. Open **Amazon SES** (same region as the app) → **Verified identities** →
   verify your sending domain (`yourcompany.com`). Add the DKIM CNAME records
   it gives you to DNS and wait for "Verified".
2. SES starts in *sandbox mode* (only verified recipients). Request
   production access: **Account dashboard → Request production access**.
   Mention transactional use (quotes, invoices, appointment confirmations).
   Approval usually takes <24h.
3. Create an SNS topic (e.g. `pestimator-email-events`), subscribe it via
   **HTTPS** to `https://app.yourcompany.com/api/webhooks/ses` — the app
   verifies the SNS signature and confirms the subscription automatically.
4. In SES, create a **configuration set** that publishes Bounce, Complaint,
   and Delivery events to that SNS topic.

## 4. Set up Stripe

1. In the Stripe dashboard grab the **live secret key** (`sk_live_...`).
2. Under **Developers → Webhooks**, add an endpoint:
   `https://app.yourcompany.com/api/webhooks/stripe`, subscribed to at least
   `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.*`.
3. Copy the endpoint's **signing secret** (`whsec_...`).

## 5. Set the environment variables

In **Amplify → App settings → Environment variables**, set:

| Variable | Value |
|---|---|
| `APP_URL` | `https://app.yourcompany.com` |
| `SESSION_SECRET` | 64 random characters — generate with `openssl rand -hex 32`. **The app refuses to boot in production without it.** |
| `AWS_REGION` | The deploy region, e.g. `us-east-1` |
| `PERSISTENCE_DRIVER` | `dynamo` |
| `COGNITO_USER_POOL_ID` | From step 2 |
| `COGNITO_CLIENT_ID` | From step 2 |
| `SES_FROM_EMAIL` | e.g. `quotes@yourcompany.com` (on the verified domain) |
| `SES_FROM_NAME` | The company name |
| `STRIPE_SECRET_KEY` | From step 4 |
| `STRIPE_WEBHOOK_SECRET` | From step 4 |

Do **not** set `LOCAL_DEV_LOGIN_*` in production — the app hard-fails if the
dev login bypass is enabled with `NODE_ENV=production`.

Redeploy the branch after saving the variables.

## 6. First-run smoke test (15 minutes)

Walk the money path end to end with yourself as the customer:

1. **Sign up** at `/signup` with the owner's email; complete TOTP MFA setup.
2. **Create the organization** in Settings, then fill in the company profile —
   name, license #, phone, support email. These appear on every PDF and email.
3. **Create a client** with your own email address.
4. **Build and send a quote** — confirm the email arrives with the branded PDF
   attached, open the portal link, and **accept** the quote.
5. Confirm the job appeared on the **Schedule** (unscheduled tray or calendar)
   and book it; send the **appointment confirmation** email.
6. **Convert to invoice** and send it. Since this is live Stripe, make the
   smoke-test quote small (e.g. $1), pay it with a real card from the hosted
   payment page, confirm the invoice flips to **PAID** automatically
   (webhook), then refund the charge in Stripe.
7. Generate a **customer portal link** from the client page and check the
   request-a-visit flow.

If any email doesn't arrive, check SES **sending statistics** and the
`emailMessages` table status field. If the invoice doesn't flip to paid,
check Stripe webhook delivery logs for the endpoint response.

## 7. Ongoing operations

- **Backups:** enable point-in-time recovery on the DynamoDB tables
  (Amplify console → the data stack in CloudFormation → each table), so
  customer/financial data is recoverable.
- **Alarms:** create CloudWatch alarms on the Amplify app's 5xx metrics and
  SES bounce rate (>5% risks SES suspension).
- **Team onboarding:** invite staff from the Team page with the right roles —
  technicians only get job-status access; estimators can't touch money.
- **New deploys:** push to `main`; Amplify builds and deploys automatically.
  Schema additions (new tables/fields) deploy with the same push.
