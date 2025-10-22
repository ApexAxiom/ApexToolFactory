# Pestimator - Static Quote Calculator

A simple, fast, and reliable pest control quote calculator that runs entirely in the browser.

## Features

- 🐜 **Zero Dependencies** - Pure HTML/CSS/JavaScript with Tailwind CDN
- 💾 **Auto-Save** - Quotes persist in browser localStorage
- 🖨️ **Print Ready** - Generate PDF quotes directly from browser
- 📦 **Export** - Download quotes as JSON for integration
- 📱 **Responsive** - Works on all devices

## Deployment

This is a static site deployed via AWS Amplify with zero build steps.

- **Live Site:** Deployed automatically on push to `main`
- **Previous App:** See `archive/2025-10-21-previous-app/` for the old Next.js version

## Local Development

Simply open `public/index.html` in a browser. No build process required.

```bash
# Serve locally (optional)
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
├── index.html    # UI and layout
└── script.js     # Calculator logic
```

No transpilation, no bundling, no frameworks - just clean, fast HTML.

