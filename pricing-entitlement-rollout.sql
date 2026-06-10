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

-- Ensure the testing email receives unlimited access whenever its profile is created.
create or replace function public.create_billing_trial_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_subscriptions (
    user_id, plan_key, status, trial_ends_at, founding_price_eligible
  ) values (
    new.id,
    case when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then 'admin' else 'free' end,
    case when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then 'active' else 'trialing' end,
    case when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then null else now() + interval '14 days' end,
    true
  )
  on conflict (user_id) do update set
    plan_key = case
      when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then 'admin'
      else public.billing_subscriptions.plan_key
    end,
    status = case
      when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then 'active'
      else public.billing_subscriptions.status
    end,
    trial_ends_at = case
      when lower(coalesce(new.email, '')) = 'jouteya1@gmail.com' then null
      else public.billing_subscriptions.trial_ends_at
    end,
    updated_at = now();
  return new;
end;
$$;

-- Replace the legacy three-project trigger with the current entitlement rules.
create or replace function public.check_project_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_count integer;
begin
  if public.has_sellsense_full_access(new.user_id) then
    return new;
  end if;

  select count(*) into project_count
  from public.projects
  where user_id = new.user_id and coalesce(is_archived, false) = false;

  if project_count >= 1 then
    raise exception 'The Free plan includes one active project. Upgrade to Pro for unlimited projects.';
  end if;
  return new;
end;
$$;
