-- ============================================================
-- Risk / breach surface hardening  ·  Batch 20  ·  additive, idempotent
--
-- AUDIT FINDING (pre-batch)
--   supabase/soft-breaches.sql defines three SECURITY DEFINER functions with
--   NO grant/revoke lines and NO caller authorization:
--
--     increment_soft_breach(account_id, rule_type)
--        -> SECURITY DEFINER, no auth check. Postgres grants EXECUTE to
--           PUBLIC by default, so any anon/authenticated PostgREST caller
--           can `supabase.rpc('increment_soft_breach', { p_account_id: <ANY>,
--           p_rule_type: <ANY> })` and fabricate / inflate breach counters on
--           ANY account (their own or another user's). No code in the repo
--           calls it — it is a reachable, unused write primitive. VULN.
--
--     get_soft_breach_count(account_id, rule_type)
--     get_account_soft_breaches(account_id)
--        -> SECURITY DEFINER read helpers that bypass the soft_breaches RLS
--           ("own read" via account ownership). Any caller can read another
--           user's breach data by passing their account_id. Info leak.
--
--   The application reads soft breaches via a direct RLS-protected
--   `.from('soft_breaches').select()` (lib/rules.js fetchSoftBreaches), and
--   never calls any of these RPCs. So the safe fix is: lock them down to
--   admin / owner and drop the implicit PUBLIC execute — zero app impact.
--
-- Also: a small idempotency guard on admin_set_account_status so re-applying
-- the same status is an explicit no-op (no duplicate audit row).
--
-- NO new lifecycle state. NO automatic breach/pass trigger. Account status
-- transitions remain operations-driven through admin_set_account_status()
-- (atomic, admin-only, audited) — there is no trusted server-side trade
-- event source to drive them automatically (see the Batch 20 report).
-- ============================================================

-- ---- 1. increment_soft_breach: admin-only, no PUBLIC execute -------
create or replace function public.increment_soft_breach(
  p_account_id uuid,
  p_rule_type  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_account_id is null or coalesce(btrim(p_rule_type), '') = '' then
    raise exception 'account id and rule type are required';
  end if;

  insert into public.soft_breaches (account_id, rule_type, breach_count, last_breach_at)
  values (p_account_id, p_rule_type, 1, now())
  on conflict (account_id, rule_type) do update set
    breach_count   = soft_breaches.breach_count + 1,
    last_breach_at = now(),
    updated_at     = now();
end;
$$;

revoke execute on function public.increment_soft_breach(uuid, text) from public;
revoke execute on function public.increment_soft_breach(uuid, text) from anon;
revoke execute on function public.increment_soft_breach(uuid, text) from authenticated;
-- (no grant back: only the table owner / a future SECURITY DEFINER caller may use it)

-- ---- 2. read helpers: owner-or-admin, no anon --------------------
create or replace function public.get_soft_breach_count(
  p_account_id uuid,
  p_rule_type  text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  if not exists (
    select 1 from public.accounts a
    where a.id = p_account_id and (a.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;

  select breach_count into v_count
  from public.soft_breaches
  where account_id = p_account_id and rule_type = p_rule_type;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.get_account_soft_breaches(
  p_account_id uuid
)
returns setof public.soft_breaches
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.accounts a
    where a.id = p_account_id and (a.user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized';
  end if;

  return query
  select * from public.soft_breaches
  where account_id = p_account_id
  order by rule_type;
end;
$$;

revoke execute on function public.get_soft_breach_count(uuid, text)   from anon;
revoke execute on function public.get_account_soft_breaches(uuid)     from anon;
grant  execute on function public.get_soft_breach_count(uuid, text)   to authenticated;
grant  execute on function public.get_account_soft_breaches(uuid)     to authenticated;

-- ---- 3. admin_set_account_status: explicit no-op on same status ---
create or replace function public.admin_set_account_status(p_account_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare acc public.accounts%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('active', 'breached', 'passed') then raise exception 'invalid status'; end if;
  select * into acc from public.accounts where id = p_account_id for update;
  if not found then raise exception 'account not found'; end if;

  if acc.status = p_status then
    return jsonb_build_object('status', acc.status, 'note', 'account was already ' || acc.status);
  end if;

  update public.accounts set status = p_status where id = p_account_id;
  perform public.log_admin_action('account.status.' || p_status, 'accounts', p_account_id,
    jsonb_build_object('from', acc.status, 'reason', p_reason));
  return jsonb_build_object('status', p_status);
end;
$$;

grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

comment on function public.increment_soft_breach(uuid, text) is
  'Admin-only soft-breach counter increment. EXECUTE revoked from PUBLIC/anon/'
  'authenticated (Batch 20) — was implicitly callable by any client.';
