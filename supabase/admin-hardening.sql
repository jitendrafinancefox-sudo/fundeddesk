-- ============================================================
-- Admin / operations hardening  ·  Batch 15
--
-- VULNERABILITIES FOUND (pre-batch)
--   VULN-1 (CRITICAL, privilege escalation): "own profile update" lets a
--     trader UPDATE their own profiles row with NO column restriction, so
--     `update profiles set role='admin' where id = auth.uid()` succeeds and
--     unlocks every is_admin()-gated write.
--   VULN-2 (CRITICAL, financial): payouts INSERT check is only
--     auth.uid()=user_id, so a trader can insert a payout row with
--     status='paid', any amount, any account_id.
--   VULN-3 (MEDIUM): orders INSERT does not constrain status, so a trader
--     can insert status='approved' orders (pollutes revenue KPIs).
--   VULN-4 (MEDIUM): payouts INSERT does not verify the account_id belongs
--     to the user, nor that the account is funded / the amount <= profit.
--
-- FIXES (least-privilege, additive, no invented business rules)
--   - profiles: revoke blanket UPDATE, re-grant only non-privileged
--     columns + a BEFORE UPDATE trigger that blocks role / id / email
--     changes unless the caller is_admin().
--   - orders / payouts: BEFORE INSERT triggers that force status and,
--     for payouts, verify ownership + funded + amount<=profit for
--     non-admin callers.
--   - Atomic, idempotent, admin-only RPCs for the money flows
--     (order approve/reject, payout paid/reject, account status) that
--     also write an admin_actions audit row.
-- ============================================================

-- ---- 0. audit helper: pin search_path (was missing) -----------------
create or replace function public.log_admin_action(
  p_action text, p_table text default null, p_row uuid default null, p_details jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_actions (admin_id, action, table_name, row_id, details)
  values (auth.uid(), p_action, p_table, p_row, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ---- 1. VULN-1: lock down profiles column writes -------------------
-- Coarse gate: authenticated may touch only these columns at all.
-- `role` is included so an ADMIN can still change roles; the trigger
-- below is the real gate that blocks NON-admin role changes.
-- `id` / `email` / `created_at` are never granted -> immutable from the client.
revoke update on public.profiles from authenticated;
grant  update (full_name, role) on public.profiles to authenticated;
do $$ begin
  -- `phone` is a schema-drift column; grant it only if it exists
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='phone') then
    execute 'grant update (phone) on public.profiles to authenticated';
  end if;
end $$;

create or replace function public.tg_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role  is distinct from old.role  then raise exception 'role change requires admin'; end if;
    if new.id    is distinct from old.id    then raise exception 'id is immutable'; end if;
    if new.email is distinct from old.email then raise exception 'email change not allowed here'; end if;
    if new.created_at is distinct from old.created_at then new.created_at := old.created_at; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- ---- 2. VULN-3: orders insert status guard ------------------------
create or replace function public.tg_orders_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.status  := 'pending';
    new.user_id := auth.uid();       -- RLS already enforces this; belt + suspenders
  end if;
  return new;
end;
$$;
drop trigger if exists orders_insert_guard on public.orders;
create trigger orders_insert_guard before insert on public.orders
  for each row execute function public.tg_orders_insert_guard();

-- ---- 3. VULN-2 / VULN-4: payouts insert guard -------------------
-- Non-admin payout inserts: status forced to 'requested', user forced to
-- the caller, account must belong to the caller AND be funded+active, and
-- amount must be a positive integer no larger than that account's profit
-- (equity - plan capital) — the canonical eligibility model already used
-- by /portal/payouts. No invented threshold.
create or replace function public.tg_payouts_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok      boolean;
  v_profit  bigint;
begin
  if public.is_admin() then
    return new;
  end if;

  new.status  := 'requested';
  new.user_id := auth.uid();

  select true, (a.equity - p.capital)
    into v_ok, v_profit
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.id = new.account_id
    and a.user_id = auth.uid()
    and a.phase = 'funded'
    and a.status = 'active';

  if not coalesce(v_ok, false) then
    raise exception 'payout account must be a funded, active account you own';
  end if;
  if new.amount is null or new.amount <= 0 or new.amount <> floor(new.amount) then
    raise exception 'payout amount must be a positive whole number';
  end if;
  if new.amount > greatest(0, v_profit) then
    raise exception 'payout amount exceeds the profit available on this account';
  end if;

  return new;
end;
$$;
drop trigger if exists payouts_insert_guard on public.payouts;
create trigger payouts_insert_guard before insert on public.payouts
  for each row execute function public.tg_payouts_insert_guard();

-- ---- 4. atomic, idempotent, admin-only money-flow RPCs -----------

-- order approval: creates exactly one account, flips the order, logs it.
-- Re-calling on an already-approved order is a no-op that returns state.
create or replace function public.admin_approve_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o        public.orders%rowtype;
  v_cap    bigint;
  v_login  text;
  v_try    int := 0;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;

  if o.status <> 'pending' then
    return jsonb_build_object('status', o.status, 'note', 'order was already ' || o.status);
  end if;

  select capital into v_cap from public.plans where id = o.plan_id;
  if v_cap is null then raise exception 'order plan is missing'; end if;

  loop
    v_try := v_try + 1;
    v_login := 'FD-' || lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    begin
      insert into public.accounts (user_id, plan_id, login_id, equity, day_start_equity)
      values (o.user_id, o.plan_id, v_login, v_cap, v_cap);
      exit;
    exception when unique_violation then
      if v_try > 8 then raise exception 'could not allocate a login id'; end if;
    end;
  end loop;

  update public.orders set status = 'approved' where id = p_order_id;
  perform public.log_admin_action('order.approve', 'orders', p_order_id,
    jsonb_build_object('login_id', v_login, 'user_id', o.user_id, 'plan_id', o.plan_id));

  return jsonb_build_object('status', 'approved', 'login_id', v_login);
end;
$$;

create or replace function public.admin_reject_order(p_order_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare o public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if o.status <> 'pending' then
    return jsonb_build_object('status', o.status, 'note', 'order was already ' || o.status);
  end if;
  update public.orders set status = 'rejected' where id = p_order_id;
  perform public.log_admin_action('order.reject', 'orders', p_order_id, '{}'::jsonb);
  return jsonb_build_object('status', 'rejected');
end;
$$;

create or replace function public.admin_set_payout_status(p_payout_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare pay public.payouts%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('paid', 'rejected') then raise exception 'invalid status'; end if;
  select * into pay from public.payouts where id = p_payout_id for update;
  if not found then raise exception 'payout not found'; end if;
  if pay.status <> 'requested' then
    return jsonb_build_object('status', pay.status, 'note', 'payout was already ' || pay.status);
  end if;
  update public.payouts set status = p_status where id = p_payout_id;
  perform public.log_admin_action('payout.' || p_status, 'payouts', p_payout_id,
    jsonb_build_object('amount', pay.amount, 'account_id', pay.account_id));
  return jsonb_build_object('status', p_status);
end;
$$;

create or replace function public.admin_set_account_status(p_account_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare acc public.accounts%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('active', 'breached', 'passed') then raise exception 'invalid status'; end if;
  select * into acc from public.accounts where id = p_account_id for update;
  if not found then raise exception 'account not found'; end if;
  update public.accounts set status = p_status where id = p_account_id;
  perform public.log_admin_action('account.status.' || p_status, 'accounts', p_account_id,
    jsonb_build_object('from', acc.status, 'reason', p_reason));
  return jsonb_build_object('status', p_status);
end;
$$;

grant execute on function public.admin_approve_order(uuid)              to authenticated;
grant execute on function public.admin_reject_order(uuid)              to authenticated;
grant execute on function public.admin_set_payout_status(uuid, text)   to authenticated;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

comment on function public.admin_approve_order(uuid) is
  'Admin-only, atomic, idempotent order approval: one account created, order '
  'flipped to approved, admin_actions row written. No-op on non-pending orders.';
