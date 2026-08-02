-- ============================================================
-- FundedDesk schema  ·  run this whole file in Supabase SQL Editor
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  role text not null default 'trader',        -- 'trader' | 'admin'
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- PLANS ----------
create table if not exists public.plans (
  id serial primary key,
  name text not null,
  capital bigint not null,
  fee bigint not null,
  target_p1 numeric not null default 8,
  target_p2 numeric not null default 5,
  max_loss numeric not null default 10,
  daily_loss numeric not null default 5,
  split numeric not null default 90,
  active boolean not null default true
);

insert into public.plans (name, capital, fee) values
  ('Starter ₹5 Lakh',   500000,  4999),
  ('Pro ₹10 Lakh',     1000000,  8999),
  ('Desk ₹25 Lakh',    2500000, 19999),
  ('Elite ₹50 Lakh',   5000000, 34999)
on conflict do nothing;

-- ---------- ORDERS (manual UPI verification flow) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id int not null references public.plans(id),
  utr text,
  status text not null default 'pending',     -- pending | approved | rejected
  created_at timestamptz default now()
);

-- ---------- ACCOUNTS ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id int not null references public.plans(id),
  login_id text not null,
  phase text not null default 'phase1',       -- phase1 | phase2 | funded
  status text not null default 'active',      -- active | breached | passed
  equity bigint not null,
  day_start_equity bigint not null,
  created_at timestamptz default now()
);

-- ---------- TRADES ----------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  instrument text not null,
  side text not null,                          -- BUY | SELL
  pnl bigint not null,
  note text,
  traded_at timestamptz default now()
);

-- ---------- PAYOUTS ----------
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  status text not null default 'requested',    -- requested | paid | rejected
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.plans    enable row level security;
alter table public.orders   enable row level security;
alter table public.accounts enable row level security;
alter table public.trades   enable row level security;
alter table public.payouts  enable row level security;

-- profiles
create policy "own profile read"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "own profile update" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- plans: everyone logged-out too can read active plans
create policy "plans public read" on public.plans for select using (true);
create policy "plans admin write" on public.plans for all using (public.is_admin());

-- orders
create policy "orders own read"    on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "orders own insert"  on public.orders for insert with check (auth.uid() = user_id);
create policy "orders admin write" on public.orders for update using (public.is_admin());

-- accounts
create policy "accounts own read"    on public.accounts for select using (auth.uid() = user_id or public.is_admin());
create policy "accounts admin all"   on public.accounts for all using (public.is_admin());

-- trades
create policy "trades own read" on public.trades for select
  using (exists (select 1 from public.accounts a where a.id = account_id and (a.user_id = auth.uid() or public.is_admin())));
create policy "trades admin write" on public.trades for insert with check (public.is_admin());
create policy "trades admin update" on public.trades for all using (public.is_admin());

-- payouts
create policy "payouts own read"   on public.payouts for select using (auth.uid() = user_id or public.is_admin());
create policy "payouts own insert" on public.payouts for insert with check (auth.uid() = user_id);
create policy "payouts admin"      on public.payouts for update using (public.is_admin());

-- ============================================================
-- AFTER YOUR FIRST SIGNUP, make yourself admin:
--   update public.profiles set role = 'admin' where email = 'YOUR-EMAIL@gmail.com';
-- ============================================================
