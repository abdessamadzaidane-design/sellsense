# SellSense Dashboard QA Review

Review date: June 8, 2026

## Fixed Findings

### Critical

- Calculator values disappeared after navigating away from a project.
  - Saved detail fields now restore.
  - Unsaved drafts persist per project and currency.
  - Older saved calculations can be reopened from history.

- Creator calculations forced one identical rate across every content piece.
  - Revenue is now separated into AdSense, TikTok, sponsorships, affiliates, products, and other income.
  - Content count is used only for average revenue and profit metrics.

- Freelancer calculations treated all work as one identical service rate.
  - Revenue is now separated into direct clients, platforms, retainers, and other services.
  - Platform commission applies only to platform revenue.

### High

- COD costs did not use the right operational volume.
  - Delivered and failed orders are separated.
  - Delivery, return, product-loss, and packaging costs use their relevant counts.

- Creator agency commission used the wrong revenue base.
  - It now applies only to sponsorship revenue.

- Reporting periods were undefined, making comparisons unreliable.
  - Users can now save a day, week, month, or client project with a period-end date.
  - The overview warns when projects use mixed reporting periods.

- Pricing restrictions interfered with product testing.
  - Full access, analytics, history, and unlimited projects are enabled.
  - Pricing sections, locks, blur effects, and upgrade flows are paused.

- Older saved cost buckets could disappear after a model upgrade.
  - Legacy calculation totals and cost breakdowns remain readable.

## Verified Scenarios

- COD: correct order-based cost multiplication and delivery-rate metrics.
- Creator: mixed revenue streams and sponsorship-only commission.
- Freelancer: platform-only commission and effective hourly metrics.
- Saved values restore after reopening a project.
- Unsaved drafts survive navigation.
- Older calculations load from history.
- MAD, USD, and EUR remain separated.
- English, French, and Arabic work on laptop, tablet, mobile, and 320px screens.

## Product Follow-Ups

- Drafts are stored locally until the user saves; they do not sync across devices.
- The current forms cover common revenue/cost categories but do not yet support custom line-item lists or CSV imports.
- Saved calculations create a new historical snapshot instead of editing an existing database row.
- Supabase row-level security and server-side validation should be audited before production launch.
