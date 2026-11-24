-- ============================================================================
-- Cinematic Arts (CA) — Supabase PostgreSQL Schema & Row-Level Security (RLS)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Profiles (Customers & Verified Sellers)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'seller', 'admin')),
  name text not null,
  email text not null unique,
  phone text,
  whatsapp text,
  address text,
  city text default 'Peshawar',
  postal_code text,
  father_name text,
  avatar_url text,
  seller_code text unique,
  is_active_seller boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_seller_code on public.profiles (upper(seller_code));

-- 2. Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  image text not null
);

-- 3. Products (cost_price protected via column-level / view separation or admin RLS)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  price integer not null check (price > 0),
  cost_price integer not null default 0 check (cost_price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  cover_image text not null,
  extra_images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '["S","M","L","XL"]'::jsonb,
  in_stock boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Public catalog view that omits cost_price
create or replace view public.public_products as
select id, slug, title, description, price, category_id, cover_image, extra_images, sizes, in_stock, featured, created_at
from public.products;

-- 4. Global Installment Plans
create table if not exists public.installment_plans (
  id text primary key,
  label text not null,
  months integer not null check (months >= 1 and months <= 36),
  advance_percent integer not null check (advance_percent >= 0 and advance_percent <= 90),
  markup_percent integer not null default 0 check (markup_percent >= 0),
  active boolean not null default true
);

-- 5. Orders
create table if not exists public.orders (
  id text primary key default ('CA-ORD-' || floor(1000 + random() * 8999)::text),
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  phone text not null,
  whatsapp text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  notes text default '',
  items jsonb not null,
  payment_method text not null check (payment_method in ('cod', 'installments')),
  plan_id text references public.installment_plans(id),
  plan_label text,
  advance_amount integer not null default 0,
  advance_paid boolean not null default false,
  monthly_amount integer not null default 0,
  total_amount integer not null,
  installment_schedule jsonb not null default '[]'::jsonb,
  referral_code text,
  referral_seller_id uuid references public.profiles(id) on delete set null,
  commission_amount integer not null default 0,
  commission_credited boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'proceeding', 'complete', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_seller on public.orders (referral_seller_id);

-- 6. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade, -- null = broadcast to all
  title text not null,
  message text not null,
  kind text not null default 'broadcast',
  related_feedback_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. Threaded Feedback & Complaints
create table if not exists public.feedback_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text,
  user_email text,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'replied', 'resolved')),
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 8. Store Settings (Terms & Policy Document)
create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 9. Manual Dashboard Entries
create table if not exists public.manual_dashboard_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  label text not null,
  revenue integer not null default 0 check (revenue >= 0),
  cost_of_goods integer not null default 0 check (cost_of_goods >= 0),
  commission_amount integer not null default 0 check (commission_amount >= 0),
  orders_count integer not null default 1 check (orders_count >= 1),
  notes text default '',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Triggers & Helper Functions
-- ============================================================================

-- Automatically credit 10% referral commission when an order becomes 'complete'
create or replace function public.credit_seller_commission_on_complete()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'complete' and old.status is distinct from 'complete'
     and new.referral_seller_id is not null
     and new.commission_credited = false then
    new.commission_amount := round(new.total_amount * 0.10);
    new.commission_credited := true;

    insert into public.notifications (user_id, title, message, kind)
    values (
      new.referral_seller_id,
      '10% Referral Commission Credited',
      format('Order %s completed. PKR %s commission credited.', new.id, new.commission_amount),
      'commission'
    );
  elsif new.status is distinct from 'complete' then
    new.commission_credited := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_credit_commission on public.orders;
create trigger trg_credit_commission
before update on public.orders
for each row execute function public.credit_seller_commission_on_complete();

-- Allow authenticated user to delete own account cleanly
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

-- Helper: check if caller has admin role claim
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.installment_plans enable row level security;
alter table public.orders enable row level security;
alter table public.notifications enable row level security;
alter table public.feedback_threads enable row level security;

-- Profiles: users read/update own profile; active seller codes verifiable for checkout; admin full access
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "Verify active seller referral code" on public.profiles
  for select using (role = 'seller' and is_active_seller = true);

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role <> 'admin');

create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id and role in ('user', 'seller'));

-- Categories & Plans: public read, admin write
create policy "Public read categories" on public.categories for select using (true);
create policy "Admin manage categories" on public.categories for all using (public.is_admin());

create policy "Public read plans" on public.installment_plans for select using (true);
create policy "Admin manage plans" on public.installment_plans for all using (public.is_admin());

-- Products: public read, admin write
create policy "Public read products" on public.products for select using (true);
create policy "Admin manage products" on public.products for all using (public.is_admin());

-- Orders: user sees own orders; seller sees referred orders; anyone can place pending order; admin manages all
create policy "Read own or referred orders" on public.orders
  for select using (
    auth.uid() = user_id
    or auth.uid() = referral_seller_id
    or public.is_admin()
  );

create policy "Create pending order" on public.orders
  for insert with check (
    status = 'pending'
    and (user_id is null or user_id = auth.uid())
    and (
      payment_method = 'cod'
      or exists (
        select 1 from public.profiles s
        where s.id = referral_seller_id and s.role = 'seller' and s.is_active_seller = true
      )
    )
  );

create policy "Admin update orders" on public.orders
  for update using (public.is_admin());

-- Notifications: read global or own; update own read flag; admin inserts
create policy "Read own or broadcast notifications" on public.notifications
  for select using (user_id is null or user_id = auth.uid() or public.is_admin());

create policy "Mark own notification read" on public.notifications
  for update using (user_id = auth.uid());

create policy "Admin send notifications" on public.notifications
  for insert with check (public.is_admin());

-- Feedback Threads: user manages own; admin reads & replies
create policy "Read own feedback" on public.feedback_threads
  for select using (user_id = auth.uid() or public.is_admin());

create policy "Create own feedback" on public.feedback_threads
  for insert with check (user_id = auth.uid());

create policy "Reply to feedback" on public.feedback_threads
  for update using (user_id = auth.uid() or public.is_admin());

-- Store Settings: public read, admin write
alter table public.store_settings enable row level security;
create policy "Public read store settings" on public.store_settings for select using (true);
create policy "Admin manage store settings" on public.store_settings for all using (public.is_admin());

-- Manual Dashboard Entries: admin only
alter table public.manual_dashboard_entries enable row level security;
create policy "Admin manage manual entries" on public.manual_dashboard_entries for all using (public.is_admin());

-- Seed default 2/3/4 month installment plans (15%, 25%, 40% interest)
insert into public.installment_plans (id, label, months, advance_percent, markup_percent, active)
values
  ('plan-2m', '2 Months', 2, 0, 15, true),
  ('plan-3m', '3 Months', 3, 0, 25, true),
  ('plan-4m', '4 Months', 4, 0, 40, true)
on conflict (id) do nothing;
