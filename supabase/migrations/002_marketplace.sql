-- Flezible migration 002: marketplace tables for the AI ordering MVP
-- Run AFTER schema.sql (it uses public.is_admin()). Safe to re-run.
-- Money is in kobo. Clients can read what they own; ALL order writes go through
-- the functions at the bottom (create_order is callable only by the server).

-- ---------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 1. Profiles (one row per signed-up user)
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'buyer' check (role in ('buyer', 'farm', 'supplier', 'logistics')),
  full_name  text not null default '' check (char_length(full_name) <= 100),
  phone      text check (phone is null or char_length(phone) between 7 and 20),
  city       text check (city is null or char_length(city) <= 100),
  state      text check (state is null or char_length(state) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Create own profile" on public.profiles;
create policy "Create own profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile automatically when someone signs up.
-- Pass { role, full_name } in the sign-up metadata; unknown roles fall back to 'buyer'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' in ('buyer', 'farm', 'supplier', 'logistics')
         then new.raw_user_meta_data ->> 'role' else 'buyer' end,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- 2. Sellers (farms and suppliers)
-- ---------------------------------------------------------------
create table if not exists public.sellers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('farm', 'supplier')),
  name       text not null check (char_length(name) between 2 and 120),
  city       text not null check (char_length(city) between 2 and 100),
  state      text not null check (char_length(state) between 2 and 100),
  delivers   boolean not null default true,
  verified   boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sellers_owner_idx on public.sellers (owner_id);

-- Does the signed-in user own this seller? (security definer avoids RLS recursion)
create or replace function public.owns_seller(p_seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sellers s
    where s.id = p_seller and s.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_seller(uuid) from public, anon;
grant execute on function public.owns_seller(uuid) to authenticated, service_role;

-- Only admins (or the SQL editor / server) may change `verified`
create or replace function public.sellers_protect_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.verified is distinct from old.verified
     and not (select public.is_admin())
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'only admins can change verification';
  end if;
  return new;
end;
$$;

drop trigger if exists sellers_protect_verified on public.sellers;
create trigger sellers_protect_verified before update on public.sellers
  for each row execute function public.sellers_protect_verified();

drop trigger if exists sellers_updated_at on public.sellers;
create trigger sellers_updated_at before update on public.sellers
  for each row execute function public.set_updated_at();

alter table public.sellers enable row level security;

drop policy if exists "Read active sellers" on public.sellers;
create policy "Read active sellers" on public.sellers
  for select to anon, authenticated
  using (active or owner_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Farms and suppliers create their seller" on public.sellers;
create policy "Farms and suppliers create their seller" on public.sellers
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and verified = false
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('farm', 'supplier')
    )
  );

drop policy if exists "Owners update their seller" on public.sellers;
create policy "Owners update their seller" on public.sellers
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners delete their seller" on public.sellers;
create policy "Owners delete their seller" on public.sellers
  for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Admins manage sellers" on public.sellers;
create policy "Admins manage sellers" on public.sellers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------
-- 3. Delivery areas
-- ---------------------------------------------------------------
create table if not exists public.seller_areas (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references public.sellers (id) on delete cascade,
  state            text not null check (char_length(state) between 2 and 100),
  city             text check (city is null or char_length(city) between 2 and 100), -- null = whole state
  lead_time_days   integer not null default 1 check (lead_time_days between 0 and 30),
  delivery_fee_kobo integer not null default 0 check (delivery_fee_kobo >= 0),
  created_at       timestamptz not null default now(),
  unique nulls not distinct (seller_id, state, city)
);

create index if not exists seller_areas_seller_idx on public.seller_areas (seller_id);

alter table public.seller_areas enable row level security;

drop policy if exists "Read areas of active sellers" on public.seller_areas;
create policy "Read areas of active sellers" on public.seller_areas
  for select to anon, authenticated
  using (
    exists (select 1 from public.sellers s where s.id = seller_id and s.active)
    or public.owns_seller(seller_id)
  );

drop policy if exists "Owners manage their areas" on public.seller_areas;
create policy "Owners manage their areas" on public.seller_areas
  for all to authenticated
  using (public.owns_seller(seller_id))
  with check (public.owns_seller(seller_id));

-- ---------------------------------------------------------------
-- 4. Listings (stock offers)
-- ---------------------------------------------------------------
create table if not exists public.listings (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.sellers (id) on delete cascade,
  product             text not null default 'eggs' check (product = 'eggs'),
  size                text not null check (size in ('small', 'medium', 'large')),
  unit                text not null check (unit in ('crate', 'tray')),
  price_per_unit_kobo integer not null check (price_per_unit_kobo > 0),
  stock_units         integer not null check (stock_units >= 0),
  min_order_units     integer not null default 1 check (min_order_units >= 1),
  available_from      date not null default current_date,
  available_to        date,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (available_to is null or available_to >= available_from)
);

create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_match_idx on public.listings (active, unit, size);

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;

drop policy if exists "Read active listings" on public.listings;
create policy "Read active listings" on public.listings
  for select to anon, authenticated
  using (
    (active and exists (select 1 from public.sellers s where s.id = seller_id and s.active))
    or public.owns_seller(seller_id)
    or (select public.is_admin())
  );

drop policy if exists "Owners manage their listings" on public.listings;
create policy "Owners manage their listings" on public.listings
  for all to authenticated
  using (public.owns_seller(seller_id))
  with check (public.owns_seller(seller_id));

-- ---------------------------------------------------------------
-- 5. AI conversations (logs and token usage; written by the server only)
-- ---------------------------------------------------------------
create table if not exists public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('order', 'listing')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'tool')),
  content         text not null check (char_length(content) <= 4000),
  tokens_in       integer,
  tokens_out      integer,
  created_at      timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "Read own conversations" on public.ai_conversations;
create policy "Read own conversations" on public.ai_conversations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Read own messages" on public.ai_messages;
create policy "Read own messages" on public.ai_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id
        and (c.user_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
-- No insert/update/delete policies: only the server (service role) writes these.

-- ---------------------------------------------------------------
-- 6. Orders (clients can read; they cannot write directly)
-- ---------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  buyer_id           uuid not null references public.profiles (id),
  seller_id          uuid not null references public.sellers (id),
  status             text not null default 'submitted' check (status in
                       ('submitted', 'accepted', 'in_delivery', 'delivered', 'completed',
                        'declined', 'cancelled', 'disputed')),
  delivery_city      text not null,
  delivery_state     text not null,
  needed_by          date not null,
  subtotal_kobo      bigint not null check (subtotal_kobo >= 0),
  delivery_fee_kobo  bigint not null default 0 check (delivery_fee_kobo >= 0),
  total_kobo         bigint not null check (total_kobo >= 0),
  notes              text check (notes is null or char_length(notes) <= 300),
  ai_conversation_id uuid references public.ai_conversations (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  listing_id      uuid not null references public.listings (id),
  units           integer not null check (units > 0),
  unit_price_kobo integer not null check (unit_price_kobo > 0)  -- price copied at order time
);

create table if not exists public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     text not null,
  actor_id   uuid references public.profiles (id),
  note       text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "Buyers and sellers read their orders" on public.orders;
create policy "Buyers and sellers read their orders" on public.orders
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.owns_seller(seller_id)
    or (select public.is_admin())
  );

-- Items and events follow the visibility of their order (the subquery applies orders' RLS)
drop policy if exists "Read items of visible orders" on public.order_items;
create policy "Read items of visible orders" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

drop policy if exists "Read events of visible orders" on public.order_events;
create policy "Read events of visible orders" on public.order_events
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

-- ---------------------------------------------------------------
-- 7. Matching: deterministic ranking, no AI involved
-- ---------------------------------------------------------------
create or replace function public.match_listings(
  p_units     integer,
  p_unit      text,
  p_size      text,      -- null = any size
  p_city      text,
  p_state     text,
  p_needed_by date
)
returns table (
  listing_id          uuid,
  seller_id           uuid,
  seller_name         text,
  seller_city         text,
  verified            boolean,
  size                text,
  unit                text,
  price_per_unit_kobo integer,
  delivery_fee_kobo   integer,
  lead_time_days      integer,
  total_kobo          bigint,
  same_city           boolean
)
language sql
stable
set search_path = ''
as $$
  select
    l.id, s.id, s.name, s.city, s.verified, l.size, l.unit,
    l.price_per_unit_kobo, a.delivery_fee_kobo, a.lead_time_days,
    (l.price_per_unit_kobo::bigint * p_units + a.delivery_fee_kobo) as total_kobo,
    (lower(s.city) = lower(p_city)) as same_city
  from public.listings l
  join public.sellers s on s.id = l.seller_id and s.active
  join lateral (
    select sa.delivery_fee_kobo, sa.lead_time_days
    from public.seller_areas sa
    where sa.seller_id = s.id
      and lower(sa.state) = lower(p_state)
      and (sa.city is null or lower(sa.city) = lower(p_city))
    order by (sa.city is null)         -- a specific city beats a whole-state entry
    limit 1
  ) a on true
  where l.active
    and l.unit = p_unit
    and (p_size is null or l.size = p_size)
    and l.stock_units >= p_units
    and l.min_order_units <= p_units
    and p_needed_by >= l.available_from
    and (l.available_to is null or p_needed_by <= l.available_to)
    and p_needed_by >= ((now() at time zone 'Africa/Lagos')::date + a.lead_time_days)
  order by (lower(s.city) = lower(p_city)) desc, total_kobo asc, s.verified desc, a.lead_time_days asc
  limit 3;
$$;

-- ---------------------------------------------------------------
-- 8. Create an order (server only): price, stock and area checked from the database
-- ---------------------------------------------------------------
create or replace function public.create_order(
  p_buyer        uuid,
  p_listing      uuid,
  p_units        integer,
  p_city         text,
  p_state        text,
  p_needed_by    date,
  p_notes        text default null,
  p_conversation uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l       public.listings;
  s       public.sellers;
  a       public.seller_areas;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_sub   bigint;
  v_order uuid;
begin
  select * into l from public.listings where id = p_listing and active for update;
  if not found then raise exception 'listing not available'; end if;

  select * into s from public.sellers where id = l.seller_id and active;
  if not found then raise exception 'seller not available'; end if;

  if s.owner_id = p_buyer then raise exception 'you cannot order from your own business'; end if;
  if p_units < l.min_order_units or p_units > l.stock_units then
    raise exception 'quantity not available';
  end if;
  if p_needed_by < l.available_from or (l.available_to is not null and p_needed_by > l.available_to) then
    raise exception 'not available on that date';
  end if;

  select * into a from public.seller_areas sa
  where sa.seller_id = s.id
    and lower(sa.state) = lower(p_state)
    and (sa.city is null or lower(sa.city) = lower(p_city))
  order by (sa.city is null)
  limit 1;
  if not found then raise exception 'seller does not deliver there'; end if;
  if p_needed_by < v_today + a.lead_time_days then raise exception 'date is too soon for this seller'; end if;

  v_sub := l.price_per_unit_kobo::bigint * p_units;

  insert into public.orders (buyer_id, seller_id, delivery_city, delivery_state, needed_by,
                             subtotal_kobo, delivery_fee_kobo, total_kobo, notes, ai_conversation_id)
  values (p_buyer, s.id, p_city, p_state, p_needed_by,
          v_sub, a.delivery_fee_kobo, v_sub + a.delivery_fee_kobo, left(p_notes, 300), p_conversation)
  returning id into v_order;

  insert into public.order_items (order_id, listing_id, units, unit_price_kobo)
  values (v_order, l.id, p_units, l.price_per_unit_kobo);

  update public.listings set stock_units = stock_units - p_units where id = l.id;

  insert into public.order_events (order_id, status, actor_id, note)
  values (v_order, 'submitted', p_buyer, null);

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid, uuid, integer, text, text, date, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, integer, text, text, date, text, uuid)
  to service_role;

-- ---------------------------------------------------------------
-- 9. Change an order's status (signed-in users; rules enforced here)
-- ---------------------------------------------------------------
create or replace function public.set_order_status(
  p_order  uuid,
  p_status text,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o         public.orders;
  v_uid     uuid := (select auth.uid());
  v_buyer   boolean;
  v_seller  boolean;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;

  v_buyer  := (o.buyer_id = v_uid);
  v_seller := public.owns_seller(o.seller_id);
  if not (v_buyer or v_seller) then raise exception 'not your order'; end if;

  if not (
       (v_seller and o.status = 'submitted'   and p_status in ('accepted', 'declined'))
    or (v_seller and o.status = 'accepted'    and p_status = 'in_delivery')
    or (v_seller and o.status = 'in_delivery' and p_status = 'delivered')
    or (v_buyer  and o.status = 'delivered'   and p_status in ('completed', 'disputed'))
    or (v_buyer  and o.status in ('submitted', 'accepted') and p_status = 'cancelled')
  ) then
    raise exception 'cannot change status from % to %', o.status, p_status;
  end if;

  update public.orders set status = p_status where id = p_order;

  -- Give the stock back when an order will never be delivered
  if p_status in ('declined', 'cancelled') then
    update public.listings l
    set stock_units = l.stock_units + i.units
    from public.order_items i
    where i.order_id = p_order and l.id = i.listing_id;
  end if;

  insert into public.order_events (order_id, status, actor_id, note)
  values (p_order, p_status, v_uid, left(p_note, 300));
end;
$$;

revoke all on function public.set_order_status(uuid, text, text) from public, anon;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------
-- 10. Optional: live order tracking in the browser (Realtime)
-- ---------------------------------------------------------------
-- alter publication supabase_realtime add table public.orders, public.order_events;
