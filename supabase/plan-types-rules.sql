-- ============================================================
-- FundedDesk — Plan Types & Rule Configurations
-- Extends plans table with plan_type and rule configurations
-- Safe & idempotent: adds columns, does not delete data
-- ============================================================

-- 1) Add plan_type column to plans table
-- Values: 'ONE_STEP', 'TWO_STEP', 'INSTANT'
alter table public.plans
  add column if not exists plan_type text not null default 'TWO_STEP'
  check (plan_type in ('ONE_STEP', 'TWO_STEP', 'INSTANT'));

-- 2) Add rule configuration columns to plans table
-- These store the rule parameters for each plan type
alter table public.plans
  add column if not exists profitable_trading_days int,
  add column if not exists profitable_day_threshold_pct numeric,
  add column if not exists profit_target_pct numeric,
  add column if not exists daily_drawdown_pct numeric,
  add column if not exists maximum_drawdown_pct numeric,
  add column if not exists position_stacking_limit int,
  add column if not exists stop_loss_required boolean,
  add column if not exists stop_loss_window_seconds int,
  add column if not exists max_soft_breaches int,
  add column if not exists inactivity_days int,
  add column if not exists minimum_trade_duration_seconds int,
  add column if not exists profit_split_pct numeric,
  add column if not exists payout_cycle_days int,
  add column if not exists payout_profitable_days int,
  add column if not exists minimum_withdrawal_pct numeric,
  add column if not exists withdrawal_cap_pct numeric,
  add column if not exists news_trading boolean,
  add column if not exists weekend_trading boolean,
  add column if not exists maximum_time_limit boolean,
  add column if not exists trailing_drawdown boolean,
  add column if not exists funded_daily_drawdown_pct numeric,
  add column if not exists funded_maximum_drawdown_pct numeric,
  add column if not exists funded_position_stacking_limit int,
  add column if not exists funded_stop_loss_required boolean,
  add column if not exists funded_stop_loss_window_seconds int,
  add column if not exists funded_max_soft_breaches int,
  add column if not exists funded_inactivity_days int,
  add column if not exists funded_minimum_trade_duration_seconds int,
  add column if not exists funded_profit_split_pct numeric,
  add column if not exists funded_payout_cycle_days int,
  add column if not exists funded_payout_profitable_days int,
  add column if not exists funded_minimum_withdrawal_pct numeric,
  add column if not exists funded_withdrawal_cap_pct numeric;

-- 3) Update existing plans with appropriate plan types
-- Default all existing plans to TWO_STEP (current behavior)
update public.plans
set plan_type = 'TWO_STEP'
where plan_type is null or plan_type = 'TWO_STEP';

-- 4) Add index for plan_type lookups
create index if not exists idx_plans_plan_type on public.plans(plan_type);

-- 5) Verify the schema
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_name = 'plans' and table_schema = 'public'
-- order by ordinal_position;