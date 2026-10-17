-- Flezible: waitlist + pricing plans schema with Row Level Security (RLS)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Money is stored in kobo (₦1 = 100 kobo) so it matches Paystack/Flutterwave later.

-- ---------------------------------------------------------------
-- 1. Admins (who may read the waitlist and edit plans)
-- ---------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- No policies on purpose: the browser can never read or write this table.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------
-- 2. Waitlist
-- ---------------------------------------------------------------
create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text not null,
  role          text not null check (role in ('farm', 'supplier', 'buyer', 'logistics')),
  city          text,
  phone         text,
  plan_interest text check (plan_interest in ('plan_a', 'plan_b', 'plan_c')),
  source        text,
  created_at    timestamptz not null default now(),

  constraint waitlist_email_length  check (char_length(email) between 5 and 254),
  constraint waitlist_email_format  check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint waitlist_name_length   check (char_length(full_name) between 2 and 100),
  constraint waitlist_city_length   check (city is null or char_length(city) <= 100),
  constraint waitlist_phone_length  check (phone is null or char_length(phone) between 7 and 20),
  constraint waitlist_source_length check (source is null or char_length(source) <= 50)
);

-- One signup per email, case-insensitive
create unique index if not exists waitlist_email_unique
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Anyone (not logged in) may add themselves. The constraints above validate the data.
drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can read or manage signups. There is no select policy for anon,
-- so the public key can never list other people's emails.
drop policy if exists "Admins can read the waitlist" on public.waitlist;
create policy "Admins can read the waitlist"
  on public.waitlist
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can manage the waitlist" on public.waitlist;
create policy "Admins can manage the waitlist"
  on public.waitlist
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------
-- 3. Plans and prices
-- ---------------------------------------------------------------
create table if not exists public.plans (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[a-z0-9_]+$'),
  name           text not null,
  tagline        text,
  commission_bps integer not null check (commission_bps between 0 and 10000), -- 300 = 3%
  trial_days     integer not null default 14 check (trial_days >= 0),
  trial_orders   integer not null default 3 check (trial_orders >= 0),
  features       text[] not null default '{}',
  sort_order     integer not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.plan_prices (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans (id) on delete cascade,
  billing_period text not null check (billing_period in ('monthly', 'weekly', 'daily')),
  amount_kobo    integer not null check (amount_kobo > 0),
  unique (plan_id, billing_period)
);

create index if not exists plan_prices_plan_id_idx on public.plan_prices (plan_id);

alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;

-- Everyone can read active plans and their prices (needed for the pricing section)
drop policy if exists "Anyone can read active plans" on public.plans;
create policy "Anyone can read active plans"
  on public.plans
  for select
  to anon, authenticated
  using (active);

drop policy if exists "Anyone can read prices of active plans" on public.plan_prices;
create policy "Anyone can read prices of active plans"
  on public.plan_prices
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.plans p
      where p.id = plan_prices.plan_id and p.active
    )
  );

-- Only admins can change plans and prices
drop policy if exists "Admins can manage plans" on public.plans;
create policy "Admins can manage plans"
  on public.plans
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can manage plan prices" on public.plan_prices;
create policy "Admins can manage plan prices"
  on public.plan_prices
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------
-- 4. Seed the three plans (safe to re-run)
-- ---------------------------------------------------------------
insert into public.plans (code, name, tagline, commission_bps, features, sort_order) values
  ('plan_a', 'Starter', 'For suppliers just getting started', 300,
    array['Basic analytics, 14 days of history',
          'Limited WhatsApp and email notifications',
          'Monthly business report on WhatsApp'], 1),
  ('plan_b', 'Growth', 'For suppliers with steady orders', 130,
    array['Advanced analytics, 90 days of history',
          'WhatsApp and email notifications',
          'Weekly business report'], 2),
  ('plan_c', 'Pro', 'For high-volume suppliers', 30,
    array['Promotion across the platform',
          'SMS, email and WhatsApp notifications',
          'More advanced analytics, 180 days of history',
          'Daily business report on WhatsApp or email',
          'Business tracker'], 3)
on conflict (code) do nothing;

-- Prices: monthly for all plans; weekly and daily for Plan A only
insert into public.plan_prices (plan_id, billing_period, amount_kobo)
select p.id, v.period, v.amount
from public.plans p
join (values
  ('plan_a', 'monthly',  500000),   -- ₦5,000
  ('plan_a', 'weekly',   150000),   -- ₦1,500
  ('plan_a', 'daily',     25000),   -- ₦250
  ('plan_b', 'monthly', 1000000),   -- ₦10,000
  ('plan_c', 'monthly', 1500000)    -- ₦15,000
) as v(code, period, amount) on v.code = p.code
on conflict (plan_id, billing_period) do nothing;

-- ---------------------------------------------------------------
-- 5. Make yourself an admin (run AFTER creating your user in
--    Authentication -> Users -> Add user). Replace the email.
-- ---------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com';

-- ---------------------------------------------------------------
-- 6. Quick RLS check (run in the SQL Editor): the public key must NOT see signups
-- ---------------------------------------------------------------
-- begin;
--   set local role anon;
--   select count(*) from public.waitlist;      -- expect 0 rows visible
--   select count(*) from public.plans;         -- expect 3
-- rollback;
