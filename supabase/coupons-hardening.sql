-- ============================================================
-- Coupon hardening  ·  Batch 14  ·  additive + one policy tightening
--
-- WHAT WAS WRONG (pre-batch)
--   1. FINANCIAL: /cart computed the discount in the browser and wrote
--      orders.fee_amount / orders.discount_percent / orders.coupon_code
--      directly. RLS on orders only checks auth.uid() = user_id, so a
--      user could DevTools-insert an order at any fee / any discount.
--   2. ENUMERATION: "coupons public read" let every authenticated (and
--      anon) user SELECT the entire live coupon table (all codes + %).
--
-- WHAT THIS MIGRATION DOES  (no invented business rules — the schema
-- only has code / discount_percent / active / expires_at)
--   - validate_coupon(code, plan_id?)  SECURITY DEFINER  -> a single-code
--     check returning a status + the minimal fields. Callers no longer
--     read the coupons table directly.
--   - tg_orders_price  BEFORE INSERT trigger on orders -> the server
--     re-derives eval_type / discount_percent / coupon_code / fee_amount
--     from plans.fee + a real coupon lookup, ignoring client values.
--   - coupons SELECT policy tightened to admin-only (the only in-repo
--     readers — /cart and /portal/coupon-codes — now use the RPC; the
--     RPC is SECURITY DEFINER so it still works).
--   - CHECK (discount_percent BETWEEN 0 AND 100) NOT VALID (new rows).
-- ============================================================

-- ---- 1. bound the discount for future coupon rows -------------------
alter table public.coupons
  drop constraint if exists coupons_discount_pct_range;
alter table public.coupons
  add constraint coupons_discount_pct_range
  check (discount_percent between 0 and 100) not valid;

-- ---- 2. stop ordinary users enumerating the coupon table -----------
drop policy if exists "coupons public read" on public.coupons;
drop policy if exists "coupons admin read" on public.coupons;
create policy "coupons admin read" on public.coupons
  for select using (public.is_admin());
-- (admin write policy from affiliate-coupons.sql is unchanged)

-- ---- 3. single-code validation RPC --------------------------------
-- Returns exactly one row. status is one of:
--   VALID | INVALID_CODE | INACTIVE | EXPIRED | NO_DISCOUNT
-- discount_percent / expires_at are only populated for VALID.
create or replace function public.validate_coupon(p_code text, p_plan_id int default null)
returns table (status text, code text, discount_percent int, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  r      public.coupons%rowtype;
begin
  if v_code = '' then
    return query select 'INVALID_CODE'::text, null::text, null::int, null::timestamptz;
    return;
  end if;

  select * into r from public.coupons where upper(code) = v_code limit 1;

  if not found then
    return query select 'INVALID_CODE'::text, null::text, null::int, null::timestamptz;
  elsif r.active is not true then
    return query select 'INACTIVE'::text, r.code, null::int, null::timestamptz;
  elsif r.expires_at is not null and r.expires_at <= now() then
    return query select 'EXPIRED'::text, r.code, null::int, r.expires_at;
  elsif coalesce(r.discount_percent, 0) <= 0 then
    return query select 'NO_DISCOUNT'::text, r.code, null::int, r.expires_at;
  else
    return query select 'VALID'::text, r.code,
                        least(100, greatest(0, r.discount_percent))::int,
                        r.expires_at;
  end if;
end;
$$;

grant execute on function public.validate_coupon(text, int) to authenticated;
grant execute on function public.validate_coupon(text, int) to anon;

comment on function public.validate_coupon(text, int) is
  'Single-code coupon check. Returns status + minimal fields so the UI '
  'never needs to read the coupons table. p_plan_id is accepted for '
  'future plan-eligibility rules (none exist in the schema today).';

-- ---- 4. server-authoritative order pricing -----------------------
-- Every order insert has its money fields recomputed from canonical data.
-- Whatever the client sent for fee_amount / discount_percent / eval_type
-- is discarded. An invalid / expired coupon is silently dropped (order
-- proceeds at full price) rather than failing checkout.
create or replace function public.tg_orders_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fee    bigint;
  v_ptype  text;
  v_disc   int := 0;
  v_code   text := nullif(upper(trim(coalesce(new.coupon_code, ''))), '');
  r        public.coupons%rowtype;
begin
  select fee, plan_type into v_fee, v_ptype
  from public.plans where id = new.plan_id;   -- FK guarantees a row exists

  -- canonical eval_type from the plan structure
  new.eval_type := case v_ptype
    when 'ONE_STEP' then '1step'
    when 'INSTANT'  then 'instant'
    else '2step'
  end;

  if v_code is not null then
    select * into r from public.coupons where upper(code) = v_code limit 1;
    if found
       and r.active is true
       and (r.expires_at is null or r.expires_at > now())
       and coalesce(r.discount_percent, 0) between 1 and 100 then
      v_disc := least(100, greatest(0, r.discount_percent));
      new.coupon_code := r.code;
    else
      new.coupon_code := null;   -- drop an unusable coupon
    end if;
  else
    new.coupon_code := null;
  end if;

  new.discount_percent := nullif(v_disc, 0);
  new.fee_amount := greatest(0, round(v_fee - (v_fee::numeric * v_disc / 100.0)))::bigint;

  return new;
end;
$$;

drop trigger if exists orders_price_guard on public.orders;
create trigger orders_price_guard
  before insert on public.orders
  for each row execute function public.tg_orders_price();
