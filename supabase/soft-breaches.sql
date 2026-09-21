-- ============================================================
-- FundedDesk — Soft Breach Tracking
-- Relational table for tracking soft breaches per account and rule type
-- ============================================================

-- Create soft_breaches table
create table if not exists public.soft_breaches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  rule_type text not null,
  breach_count int not null default 0,
  last_breach_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, rule_type)
);

-- Rule types enum (for documentation - enforced in application)
-- 'POSITION_STACKING' - 4th trade on same instrument/same direction
-- 'STOP_LOSS' - Missing stop loss beyond window
-- 'MINIMUM_TRADE_DURATION' - Trade held less than minimum duration
-- 'NEWS_TRADING' - Trade during restricted news window
-- 'WEEKEND_TRADING' - Position over weekend
-- 'POSITION_STACKING_FUNDED' - Funded stage position stacking
-- 'STOP_LOSS_FUNDED' - Funded stage stop loss

-- Index for account lookups
create index if not exists idx_soft_breaches_account_id on public.soft_breaches(account_id);

-- RLS
alter table public.soft_breaches enable row level security;

-- Policies
create policy "soft_breaches own read" on public.soft_breaches
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = soft_breaches.account_id
      and (a.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "soft_breaches admin write" on public.soft_breaches
  for all using (public.is_admin());

-- Trigger to auto-update updated_at
create or replace function public.update_soft_breaches_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists on_soft_breaches_updated on public.soft_breaches;
create trigger on_soft_breaches_updated
  before update on public.soft_breaches
  for each row execute function public.update_soft_breaches_updated_at();

-- ============================================================
-- Helper function to increment soft breach count
-- ============================================================
create or replace function public.increment_soft_breach(
  p_account_id uuid,
  p_rule_type text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.soft_breaches (account_id, rule_type, breach_count, last_breach_at)
  values (p_account_id, p_rule_type, 1, now())
  on conflict (account_id, rule_type) do update set
    breach_count = soft_breaches.breach_count + 1,
    last_breach_at = now(),
    updated_at = now();
end $$;

-- Helper function to get soft breach count for an account and rule type
create or replace function public.get_soft_breach_count(
  p_account_id uuid,
  p_rule_type text
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  select breach_count into v_count
  from public.soft_breaches
  where account_id = p_account_id and rule_type = p_rule_type;
  
  return coalesce(v_count, 0);
end $$;

-- Helper function to get all soft breaches for an account
create or replace function public.get_account_soft_breaches(
  p_account_id uuid
)
returns setof public.soft_breaches language plpgsql security definer set search_path = public as $$
begin
  return query
  select * from public.soft_breaches
  where account_id = p_account_id
  order by rule_type;
end $$;