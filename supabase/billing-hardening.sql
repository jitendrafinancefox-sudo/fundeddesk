-- ============================================================
-- Billing / orders hardening  ·  Batch 19  ·  additive, idempotent
--
-- CONTEXT (what was already done, and is NOT repeated here)
--   Batch 14 (coupons-hardening.sql):
--     - tg_orders_price  BEFORE INSERT on orders -> the server re-derives
--       eval_type / discount_percent / coupon_code / fee_amount from
--       plans.fee + a real coupon lookup. Client money values are discarded.
--     - validate_coupon() RPC; coupons SELECT tightened to admin-only.
--   Batch 15 (admin-hardening.sql):
--     - tg_orders_insert_guard -> non-admin inserts forced to
--       status='pending', user_id=auth.uid().
--     - admin_approve_order() / admin_reject_order() -> atomic (FOR UPDATE),
--       idempotent (no-op unless status='pending'), admin-only, audited.
--       One account per approved order, login-id retry loop.
--
-- WHAT THIS MIGRATION ADDS  (no invented business rules)
--   1. SCHEMA DRIFT FIX: orders.eval_type / orders.fee_amount are written by
--      tg_orders_price and read by /admin + /cart + the new /portal/orders,
--      but no committed migration ever created them. Added here as nullable
--      columns so a fresh `supabase/*` apply is self-consistent. Existing
--      deployments already have them -> `add column if not exists` is a no-op.
--   2. orders.status CHECK ('pending'|'approved'|'rejected') NOT VALID — the
--      only three values any code path uses. NOT VALID leaves historical rows
--      untouched; it just stops a bad value being written going forward.
--   3. Duplicate-submit guard: a partial UNIQUE index on
--      (user_id, plan_id, utr) WHERE status='pending'. A user cannot lodge
--      the SAME payment reference for the SAME plan twice while the first is
--      still awaiting verification (double-clicked "Place Order", refresh +
--      resubmit). Different plans, different UTRs, and re-submitting after a
--      rejection are all still allowed — legitimate repeat purchases are not
--      blocked.
--   4. Index orders(user_id, created_at desc) — the trader order-history page
--      and the "pending orders" query both filter by user_id; /admin lists
--      by created_at. No index existed on orders beyond the PK.
--   5. `with check (public.is_admin())` added to the admin UPDATE policy on
--      orders (it had USING only) so an admin row-write cannot flip an order
--      to a non-admin-owned state. Admin mutations still go through the
--      SECURITY DEFINER RPCs; this is belt-and-suspenders.
--
-- Nothing here creates a payment-gateway table, a refunds table, an invoice
-- table, a commission model, or a reconciliation ledger — none of those
-- exist in the product and this batch does not invent them.
-- ============================================================

-- ---- 1. schema-drift columns (no-op where already present) ---------
alter table public.orders add column if not exists eval_type  text;
alter table public.orders add column if not exists fee_amount bigint;

comment on column public.orders.eval_type  is
  'Server-derived from plans.plan_type by tg_orders_price (1step|2step|instant). Not client-authoritative.';
comment on column public.orders.fee_amount is
  'Server-derived payable fee in INR by tg_orders_price (plans.fee minus a validated coupon). Not client-authoritative.';

-- ---- 2. bound the order status -----------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('pending', 'approved', 'rejected')) not valid;
  end if;
end $$;

-- ---- 3. duplicate-submit guard (partial unique) -----------------
-- Same (user, plan, payment reference) cannot be pending twice at once.
create unique index if not exists uq_orders_pending_dupe
  on public.orders (user_id, plan_id, utr)
  where status = 'pending' and utr is not null;

-- ---- 4. supporting index for history / pending queries ----------
create index if not exists idx_orders_user_created
  on public.orders (user_id, created_at desc);

-- ---- 5. tighten the admin UPDATE policy on orders ---------------
drop policy if exists "orders admin write" on public.orders;
create policy "orders admin write" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

comment on index public.uq_orders_pending_dupe is
  'Blocks a repeated pending order for the same (user, plan, UTR) — e.g. a '
  'double-clicked checkout. Rejected orders and distinct UTRs are unaffected.';
