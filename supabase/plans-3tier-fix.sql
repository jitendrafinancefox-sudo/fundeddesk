-- ============================================================
-- FundedDesk — reset to exactly 3 challenge tiers: ₹2L / ₹5L / ₹10L
-- Safe & idempotent: nothing is deleted, so any test accounts/orders
-- you already created still work. Old 25L/50L are just hidden.
-- No margin/leverage field is introduced anywhere — capital is the
-- only limit (max_loss / daily_loss are plain % of capital).
-- Run the WHOLE file in Supabase SQL Editor.
-- ============================================================

-- 1) Hide the old ₹25L / ₹50L tiers (kept in the table for history only)
update public.plans set active = false where capital in (2500000, 5000000);

-- 2) Add the new ₹2 Lakh tier if it doesn't already exist
insert into public.plans (name, capital, fee, target_p1, target_p2, max_loss, daily_loss, split, active)
select '₹2 Lakh', 200000, 2999, 8, 5, 10, 5, 90, true
where not exists (select 1 from public.plans where capital = 200000);

-- 3) Make sure ₹5L / ₹10L are active with the correct name + fee
update public.plans set name = '₹5 Lakh',  fee = 4999, active = true where capital = 500000;
update public.plans set name = '₹10 Lakh', fee = 8999, active = true where capital = 1000000;

-- 4) Verify — should show exactly 3 rows, ₹2L → ₹10L
select name, capital, fee, target_p1, target_p2, max_loss, daily_loss, split
from public.plans where active = true order by capital;
