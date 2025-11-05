# Pestimator — Landing Experience & Quoting Studio

Pestimator now ships with a premium marketing homepage, Amplify-ready authentication, and the full quoting workspace—all delivered as a static bundle.

## Features

- 🐜 **Showcase homepage** – A modern, mobile-first marketing page for Pestimator.com.
- 🔐 **Amplify-aware auth** – Dedicated sign-in screen that integrates with AWS Amplify (Cognito) or falls back to an offline demo.
- 💼 **Quoting studio** – Existing calculator preserved in `tool.html` with secure profile storage when authenticated.
- 💾 **Auto-save** – Quotes persist in browser storage; encrypted profile vault when signed in.
- 🖨️ **Print ready** – Export polished, white-labeled PDFs directly from the browser.

## Deployment

The site remains a static bundle (no build step) and is suitable for AWS Amplify hosting.

- **Live Site:** Deploy contents of `public/`.
- **Previous App:** Historical Next.js version lives under `archive/2025-10-21-previous-app/`.

## Structure

```
public/
├── index.html     # Marketing homepage
├── login.html     # Amplify-ready sign-in experience
├── tool.html      # Quoting studio (formerly index.html)
├── auth.js        # Shared authentication helper (Amplify + demo fallback)
├── config.js      # Placeholder for Amplify configuration
└── script.js      # Calculator logic powering tool.html
```

### Amplify configuration

1. Copy your Amplify-generated web config into `public/config.js` (or inject at deploy time).
2. Required keys typically include `aws_project_region`, `aws_cognito_region`, `aws_user_pools_id`, and `aws_user_pools_web_client_id`.
3. Never commit secrets—reference them via AWS Secrets Manager/SSM when deploying.

Without configuration, the sign-in page operates in **offline demo mode** and simply stores a session locally.

## Local Development

Open any of the HTML files directly, or serve them locally:

```bash
cd public
python -m http.server 8000
# or
npx serve
```

## Quote Calculation Formula

```
Base = SquareFootage × BaseRate[PestType] × VisitMultiplier[VisitType]
SeverityAdjustment = Base × (Severity - 1) × 0.07
BaseTotal = Base + SeverityAdjustment
PreMarkup = BaseTotal + Labor + Materials + Travel
Subtotal = PreMarkup + (PreMarkup × MarkupPercent)
Total = Subtotal + (Subtotal × TaxPercent)
```

### Base Rates (per sqft)
- General: $0.06
- Termite: $0.18
- Rodent: $0.10
- Mosquito: $0.08

### Visit Type Multipliers
- One-time: 1.00
- Monthly: 0.75
- Quarterly: 0.85

## Architecture

```
public/
├── tool.html  # App UI and layout
└── script.js  # Calculator logic
```

No transpilation, no bundling, no frameworks—just clean, fast HTML enhanced with Tailwind CDN and AWS Amplify JS.

