-- ============================================================
-- Admin trade-P&L reconciliation aggregate  ·  Batch 26  ·  additive
--
-- AUDIT FINDING (Phase 18, P0-2)
--   Re-verified this phase directly against app/admin/page.js: loadAll()
--   fetches `supabase.from('trades').select('account_id, pnl').limit(5000)`
--   — an unordered, whole-table, no-account-scoping scan — on every single
--   admin page load, solely to build a client-side { account_id: Σpnl }
--   map (`tradePnlByAccount`) used by exactly one consumer: the
--   `ReconChip` next to each account's equity figure
--   (`reconcileAccountEquity(a, a.plans, [{ pnl: tradePnlByAccount[a.id]
--   || 0 }])`). Past 5,000 total platform-wide trades, this silently
--   returns an arbitrary subset (no ORDER BY makes the truncation
--   non-deterministic) and the reconciliation chip becomes actively
--   misleading, not just slow.
--
-- WHY A SECURITY DEFINER RPC, NOT A PLAIN VIEW
--   This repository already has an established, precedented answer for
--   "an admin needs an aggregate across rows they don't individually
--   own": supabase/leaderboard.sql's get_leaderboard() and
--   supabase/affiliate.sql's get_affiliate_referrals() are both
--   SECURITY DEFINER functions with an explicit authorization check
--   inside, specifically because RLS alone does not safely serve a
--   cross-row aggregate the way it serves a single-row-ownership check.
--   This migration follows that exact, already-audited pattern rather
--   than introducing a new mechanism (a bare view whose RLS-inheritance
--   behavior across Postgres/PostgREST versions would need separate,
--   careful re-verification) for the same problem this codebase has
--   already solved twice.
--
-- WHAT THIS FUNCTION DOES AND DOES NOT EXPOSE
--   Returns exactly two columns — account_id and the SUM of that
--   account's trades.pnl — one row per account that has at least one
--   trade. No instrument, side, note, traded_at, request_id, or any
--   other trade field is exposed. This is deliberately NOT a general
--   "admin can read all trades" endpoint: it answers only the one
--   question the reconciliation chip needs.
--
--   Takes NO parameters. There is no account_id (or any other) input a
--   client could supply, so there is nothing for an untrusted caller to
--   manipulate to see data they shouldn't — authorization is a single
--   is_admin() gate in front of a fixed, parameterless aggregate query,
--   mirroring admin_add_trade's own "check first, then act" structure.
--
--   Bounded by DISTINCT ACCOUNT COUNT, not total trade volume — a
--   platform with millions of trades but, say, 50,000 accounts returns
--   at most 50,000 small rows here, which is the structural fix for
--   Phase 18's P0-1/P0-2 finding (the old query scaled with trade count;
--   this one scales with account count, which grows far more slowly).
--
-- SAFETY
--   - Additive only: one new function, its grants, and a comment.
--     No table, column, row, RLS policy, or existing grant is touched.
--   - `create or replace` makes this safe to re-run.
--   - Reversible: `drop function if exists public.admin_trade_pnl_by_account();`
--     removes it with no data-loss risk (see the Phase 19 report's
--     rollback section).
--   - Does not depend on, and does not modify, public.trades.request_id,
--     uq_trades_request_id, or admin_add_trade in any way — this is a
--     read-only aggregate over the same trades.pnl column every other
--     reconciliation/analytics path already reads.
-- ============================================================

create or replace function public.admin_trade_pnl_by_account()
returns table (account_id uuid, total_pnl bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select t.account_id, sum(t.pnl)::bigint as total_pnl
    from public.trades t
    group by t.account_id;
end;
$$;

revoke execute on function public.admin_trade_pnl_by_account() from public;
revoke execute on function public.admin_trade_pnl_by_account() from anon;
grant  execute on function public.admin_trade_pnl_by_account() to authenticated;

comment on function public.admin_trade_pnl_by_account() is
  'Admin-only aggregate: SUM(trades.pnl) grouped by account_id, for the '
  'admin dashboard reconciliation diagnostic (Batch 26). Replaces a raw '
  'client-side scan of up to 5000 trades rows (Phase 18 P0-2). Returns '
  'only account_id + total_pnl — no per-trade fields, no arbitrary '
  'client-supplied filters, no row cap.';
