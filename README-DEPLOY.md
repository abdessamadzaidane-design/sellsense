# SellSense Founding Pro Product Edition

This folder is the deployment-ready static website. Upload the folder contents to the root of the GitHub repository connected to Vercel.

## Included

- Root URL stays at `/`; `/sellsense-landing.html` permanently redirects to `/`
- English and French UI; Arabic/Darija is currently hidden from the language switcher
- Royal wine red and gold visual system with the outlined Moroccan star motif
- Smooth full-turn logo-star animation and subtle dashboard interactions
- 14-day Pro trial, then Free plan limits: 1 active project and 3 saved periods
- Pricing is active: $9.99 monthly or $99.99 yearly
- Stripe checkout, customer portal, Premium locks, and upgrade prompts are included
- Permanent unlimited testing access is enabled for `jouteya1@gmail.com`
- Saved calculation details restore when reopening history entries
- Older calculations can be reopened from history
- Day, week, month, or client-project reporting periods
- MAD, USD, and EUR calculations remain separated

## Calculation Model

Each business type uses its own practical model:

- E-commerce / COD separates delivered and failed orders. Delivery, return, product, and packaging costs use the correct order counts.
- Content creators enter separate AdSense, TikTok, sponsorship, affiliate, product, and other revenue. Content count is used for averages only.
- Freelancers separate direct client, platform, recurring, and other service revenue. Platform commission applies only to platform revenue.
- Useful metrics include delivery rate, profit per delivered order, revenue/profit per content, sponsorship share, effective net hourly rate, and revenue per client.
- Taxes are intentionally not included.

Older saved calculations remain readable using their original total-value model.

## Validation

- Exact COD, creator, and freelancer formula scenarios passed
- Default calculator inputs and placeholders are `0`
- Saved details and older-history loading passed
- English and French language switcher passed
- Laptop, tablet, mobile, and 320px layouts passed without horizontal overflow
- Mixed-currency handling passed
- Stripe auth protection passed; checkout requires a signed-in user

Deploy this folder as the Vercel project root.
