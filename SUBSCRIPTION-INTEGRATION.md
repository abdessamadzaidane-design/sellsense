# Subscription Integration

The conversion UI and browser-side access states are implemented. Connect a real payment provider and server-side enforcement before accepting payments.

## Payment Checkout

1. Create a recurring `$10/month` product with your payment provider.
2. Put its secure checkout URL in `PREMIUM_CHECKOUT_URL` inside `sellsense-dashboard.html`.
3. Configure a payment webhook that updates the matching Supabase profile.

SellSense recognizes either:

- `plan = 'premium'`
- `subscription_status = 'active'`

## Recommended Supabase Profile Fields

- `plan` with default value `free`
- `subscription_status`
- `subscription_customer_id`
- `subscription_ends_at`
- `created_at`

## Security Requirement

The current locks provide the intended user experience, but browser code can be bypassed. Enforce the one-project limit, calculation-save limit, and Premium data access using Supabase row-level security, database functions, or a trusted server or Edge Function before launch.
