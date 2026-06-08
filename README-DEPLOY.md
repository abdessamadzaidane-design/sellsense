# SellSense Open Beta Product Edition

This folder is the deployment-ready static website. Upload the folder contents to the root of the GitHub repository connected to Vercel.

## Included

- Root URL stays at `/`; `/sellsense-landing.html` permanently redirects to `/`
- English, French, and Moroccan Darija UI
- Improved Arabic hero spacing and corrected `صافي` spelling
- Consistent royal wine red and gold styling
- Smooth full-turn logo-star animation and subtle dashboard interactions
- Open beta with full dashboard access and unlimited projects
- Pricing, Premium locks, blur effects, and checkout are paused
- Saved calculation details and unsaved project drafts restore automatically
- Older calculations can be reopened from history
- Day, week, month, or client-project reporting periods
- MAD, USD, and EUR calculations remain separated

## Calculation Model

Each business type now uses its own practical model:

- E-commerce / COD separates delivered and failed orders. Delivery, return, product, and packaging costs use the correct order counts.
- Content creators enter separate AdSense, TikTok, sponsorship, affiliate, product, and other revenue. Content count is used for averages only.
- Freelancers separate direct client, platform, recurring, and other service revenue. Platform commission applies only to platform revenue.
- Useful metrics include delivery rate, profit per delivered order, revenue/profit per content, sponsorship share, effective net hourly rate, and revenue per client.
- Taxes are intentionally not included

Older saved calculations remain readable using their original total-value model.

## Validation

- Exact COD, creator, and freelancer formula scenarios passed
- Default calculator inputs and placeholders are `0`
- Saved details, unsaved drafts, and older-history loading passed
- Full access and unlimited projects passed for expired/free test users
- Arabic, French, and English translation dictionaries passed
- Laptop, tablet, mobile, and 320px layouts passed without horizontal overflow
- Mixed-currency handling passed

Deploy this folder as the Vercel project root.
