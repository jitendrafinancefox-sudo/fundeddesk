-- ============================================================
-- FundedDesk — One-Step & Instant plan catalogue seed
--
-- Depends on supabase/plan-types-rules.sql having already been run
-- (adds plan_type + rule-override columns to public.plans). Run that
-- migration FIRST if it hasn't been applied to this project yet.
--
-- Adds 6 new ACTIVE, purchasable plan rows. Does NOT touch, update,
-- or reorder any existing row — the 3 existing Two-Step plans (ids
-- 1, 2, 5) and the 2 inactive legacy rows (ids 3, 4) are untouched.
--
-- Rule values per the explicit product spec supplied 2026-09-19:
--   ONE-STEP : profit target 10% · daily DD 4% · max DD 8% ·
--              profit split 80% · min. trading days 5
--   INSTANT  : NO profit target (direct-access program, not an
--              evaluation) · daily DD 4% · max DD 8% ·
--              profit split 80% · min. trading days 5
--
-- max_loss / daily_loss (legacy flat columns, still read by the live
-- portal drawdown gauge at app/portal/page.js) are set to match the
-- new maximum_drawdown_pct / daily_drawdown_pct values so a real
-- trading account opened against these plans shows the correct limit
-- there too. Every other rule value is resolved exclusively through
-- the canonical engine (lib/rules.js -> getRulesForAccount), same as
-- every existing plan — no second rule source is introduced.
--
-- Idempotent: each insert is guarded by a NOT EXISTS check on
-- (name, plan_type), so running this file twice does not duplicate
-- rows.
-- ============================================================

-- ---------------- ONE-STEP ----------------

insert into public.plans
  (name, capital, fee, active, plan_type,
   profit_target_pct, daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'One-Step ₹2 Lakh', 200000, 2499, true, 'ONE_STEP',
       10, 4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'One-Step ₹2 Lakh' and plan_type = 'ONE_STEP'
);

insert into public.plans
  (name, capital, fee, active, plan_type,
   profit_target_pct, daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'One-Step ₹5 Lakh', 500000, 4499, true, 'ONE_STEP',
       10, 4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'One-Step ₹5 Lakh' and plan_type = 'ONE_STEP'
);

insert into public.plans
  (name, capital, fee, active, plan_type,
   profit_target_pct, daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'One-Step ₹10 Lakh', 1000000, 7999, true, 'ONE_STEP',
       10, 4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'One-Step ₹10 Lakh' and plan_type = 'ONE_STEP'
);

-- ---------------- INSTANT ----------------
-- profit_target_pct intentionally omitted (stays NULL) — Instant has
-- no evaluation profit target. The UI (lib/planRules.js -> finite())
-- already renders a null profitTargetPct by omitting the field
-- entirely, never as "0%".

insert into public.plans
  (name, capital, fee, active, plan_type,
   daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'Instant ₹2 Lakh', 200000, 5999, true, 'INSTANT',
       4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'Instant ₹2 Lakh' and plan_type = 'INSTANT'
);

insert into public.plans
  (name, capital, fee, active, plan_type,
   daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'Instant ₹5 Lakh', 500000, 9999, true, 'INSTANT',
       4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'Instant ₹5 Lakh' and plan_type = 'INSTANT'
);

insert into public.plans
  (name, capital, fee, active, plan_type,
   daily_drawdown_pct, maximum_drawdown_pct,
   profit_split_pct, profitable_trading_days,
   max_loss, daily_loss)
select 'Instant ₹10 Lakh', 1000000, 17999, true, 'INSTANT',
       4, 8, 80, 5, 8, 4
where not exists (
  select 1 from public.plans where name = 'Instant ₹10 Lakh' and plan_type = 'INSTANT'
);

-- ---------------- verify ----------------
-- select id, name, capital, fee, plan_type, profit_target_pct,
--        daily_drawdown_pct, maximum_drawdown_pct, profit_split_pct,
--        profitable_trading_days, active
-- from public.plans
-- order by plan_type, capital;
