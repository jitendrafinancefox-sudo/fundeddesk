-- ============================================================
-- Audit-log RPC hardening  ·  Batch 21  ·  additive, idempotent
--
-- AUDIT FINDING (Phase 9)
--   public.log_admin_action(p_action, p_table, p_row, p_details) is
--   SECURITY DEFINER with NO internal auth.uid()/is_admin() check and NO
--   explicit REVOKE anywhere in the repo (analytics-support.sql created it,
--   admin-hardening.sql only re-pinned search_path — neither restricts who
--   may call it). Postgres grants EXECUTE on a new function to PUBLIC by
--   default, so any authenticated (and likely anon) client can call
--   `supabase.rpc('log_admin_action', {...})` directly and insert an
--   arbitrary row into public.admin_actions — a client-side UI check on
--   /admin (isAdmin) is the ONLY thing stopping a normal user from doing
--   this today; that is not a security boundary (see repo-wide Phase 9
--   audit, Step 17).
--
--   Impact: admin_actions SELECT is already admin-only (analytics-support.sql
--   "actions admin read"), so this is NOT a data-leak — it's an audit-log
--   INTEGRITY gap: any authenticated user could write fabricated entries
--   into the admin audit trail (wrong action/table/row/details), polluting
--   or muddying the one durable record of privileged operations.
--
-- FIX (mirrors the exact pattern every other admin RPC in this repo already
-- uses — admin_approve_order, admin_reject_order, admin_set_payout_status,
-- admin_set_account_status all start with `if not public.is_admin() then
-- raise exception`):
--   - add the same is_admin() guard as the function's first statement.
--   - explicit grant to `authenticated` only (mirrors the other admin RPCs);
--     no anon grant existed or is added.
--
-- SAFE FOR EXISTING CALLERS: every current caller of log_admin_action is
-- itself an admin-only SECURITY DEFINER function (admin_approve_order,
-- admin_reject_order, admin_set_payout_status, admin_set_account_status,
-- admin_reply_ticket, admin_set_ticket_status) that already verified
-- is_admin() before reaching this call, or is app/admin/page.js's own
-- direct RPC calls (only reachable today via the admin-only UI). auth.uid()
-- resolves to the real calling session throughout a SECURITY DEFINER call
-- chain, so re-checking is_admin() here does not change behavior for any
-- legitimate caller — it only blocks a non-admin calling the RPC directly.
-- ============================================================

create or replace function public.log_admin_action(
  p_action text, p_table text default null, p_row uuid default null, p_details jsonb default '{}'
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
  insert into public.admin_actions (admin_id, action, table_name, row_id, details)
  values (auth.uid(), p_action, p_table, p_row, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_admin_action(text, text, uuid, jsonb) from public;
revoke execute on function public.log_admin_action(text, text, uuid, jsonb) from anon;
grant  execute on function public.log_admin_action(text, text, uuid, jsonb) to authenticated;

comment on function public.log_admin_action(text, text, uuid, jsonb) is
  'Admin-only audit-log writer. is_admin() check + EXECUTE restricted to '
  'authenticated (Batch 21) — was previously callable by any client with no '
  'authorization check, letting a non-admin insert fabricated admin_actions rows.';
