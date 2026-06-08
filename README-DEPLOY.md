# SellSense Unit Economics Edition

This folder is the deployment-ready static website. Upload the folder contents to the root of the GitHub repository connected to Vercel.

## Included

- Root URL stays at `/`; `/sellsense-landing.html` permanently redirects to `/`
- English, French, and Moroccan Darija UI
- Improved Arabic hero spacing and corrected `صافي` spelling
- Consistent royal wine red and gold styling
- Smooth full-turn logo-star animation and subtle dashboard interactions
- Softer Premium locked states
- Free plan: 1 project and 7 days of full visibility
- Premium plan: $10/month, unlimited projects, full insights, daily tracking, and complete history
- MAD, USD, and EUR calculations remain separated

## Calculation Model

New calculations use unit economics:

- E-commerce / COD revenue = selling price per unit x units sold
- Creator revenue = revenue per content piece x paid or monetized pieces
- Freelancer revenue = price per service or deliverable x delivered units
- Per-unit costs are multiplied automatically
- Percentage fees are calculated from revenue
- Fixed operating expenses are added once
- Taxes are intentionally not included

Older saved calculations remain readable using their original total-value model.

## Validation

- Exact COD, creator, and freelancer calculation scenarios passed
- Default calculator inputs and placeholders are `0`
- Arabic, French, and English translation dictionaries passed
- Free, expired-trial, and Premium states passed
- Laptop, tablet, mobile, and 320px layouts passed without horizontal overflow
- Mixed-currency handling passed

Deploy this folder as the Vercel project root.
