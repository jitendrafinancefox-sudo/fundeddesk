-- ============================================================
-- Affiliate + Coupon migration  ·  additive only
--   - CREATE new tables: referrals, coupons
--   - ADD columns to existing tables (nullable, non-breaking)
--   - REPLACE trigger function to capture referred_by from user metadata
-- ============================================================

-- ---------- COUPONS ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_percent int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- REFERRALS ----------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid references public.profiles(id) on delete set null,
  code text unique not null,
  created_at timestamptz default now()
);

-- ---------- ADDITIVE COLUMN ADDITIONS ----------
alter table public.profiles add column if not exists referred_by text;
alter table public.orders   add column if not exists coupon_code text;
alter table public.orders   add column if not exists discount_percent int;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.coupons    enable row level security;
alter table public.referrals  enable row level security;

-- coupons: anyone can read active, non-expired codes; admin can manage
create policy "coupons public read" on public.coupons
  for select using (active = true and (expires_at is null or expires_at > now()));
create policy "coupons admin write" on public.coupons
  for all using (public.is_admin());

-- referrals: users can read their own rows (as referrer or referred);
-- users can insert their own referral code; admin full access
create policy "referrals own read" on public.referrals
  for select using (referrer_id = auth.uid() or referred_user_id = auth.uid() or public.is_admin());
create policy "referrals own insert" on public.referrals
  for insert with check (referrer_id = auth.uid());
create policy "referrals admin write" on public.referrals
  for all using (public.is_admin());

-- ---------- TRIGGER UPDATE ----------
-- Replace handle_new_user to also capture referred_by from signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, referred_by)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'ref_code');
  return new;
end $$;
