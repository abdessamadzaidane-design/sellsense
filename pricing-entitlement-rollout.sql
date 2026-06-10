-- SellSense pricing entitlement rollout
-- Apply after the original billing migration.

-- Normalize free trials to 14 days without changing paid or admin access.
update public.billing_subscriptions
set
  trial_ends_at = least(
    coalesce(trial_ends_at, created_at + interval '14 days'),
    created_at + interval '14 days'
  ),
  updated_at = now()
where plan_key = 'free';

-- Give the internal product-testing account permanent unlimited access.
insert into public.billing_subscriptions (
  user_id, plan_key, status, trial_ends_at, founding_price_eligible
)
select id, 'admin', 'active', null, true
from auth.users
where lower(email) = 'jouteya1@gmail.com'
on conflict (user_id) do update set
  plan_key = 'admin',
  status = 'active',
  trial_ends_at = null,
  updated_at = now();
