-- ============================================================
-- Leaderboard aggregation  ·  Batch 6  ·  additive only
--
-- WHY A FUNCTION IS REQUIRED
--   RLS on public.accounts ("accounts own read": auth.uid() = user_id)
--   and public.profiles ("own profile read": auth.uid() = id) mean a
--   browser client can only ever read its OWN rows. A cross-trader
--   leaderboard therefore cannot be built from a normal client query
--   without either weakening RLS or shipping a service-role key to the
--   browser — neither is acceptable.
--
--   This SECURITY DEFINER function is the safe, RLS-preserving path
--   (same pattern the repo already uses for is_admin / increment_soft_breach
--   / get_account_soft_breaches). It returns ONLY non-identifying,
--   already-derivable aggregates:
--     - an anonymised, deterministic trader tag  (md5 of user_id, 4 hex)
--     - an anonymised, deterministic account tag (md5 of account id, 4 hex)
--     - plan name / type, capital, equity  (already visible to each owner)
--     - net P&L and return %               (equity - capital, and /capital)
--     - account status
--     - is_you: true only for the caller's own rows (via auth.uid())
--   No email, full_name, phone, user_id or raw account UUID is exposed.
--
-- ELIGIBILITY  (LEADERBOARD ELIGIBILITY — PRODUCT GAP: no explicit rule
--   exists in the product). Implemented as the safest data-backed reading:
--   funded + live, i.e.  accounts.phase = 'funded' AND accounts.status = 'active'
--   — the same condition app/dashboard/page.js uses to mark an account
--   "funded and active". Breached / passed-not-funded / challenge accounts
--   are excluded. Change the WHERE clause here if the product defines a
--   different rule later.
--
-- PERFORMANCE METRIC
--   return_pct = (equity - capital) / capital * 100
--   net_pnl    = equity - capital
--   This is the canonical account financial model already used across the
--   portal (lib/accounts.js accountFinancials, KPIRow, AccountContext).
--   accounts.equity is the authoritative current equity (admin trade flow
--   updates it as equity + pnl). There is no deposit/withdrawal concept in
--   the schema. Time period: ALL-TIME only — no per-period trade history
--   aggregation is reliable in the current schema.
--
-- RANKING is deterministic:
--   ORDER BY return_pct DESC NULLS LAST, net_pnl DESC, created_at ASC, id ASC
-- ============================================================

-- Remove any earlier/stale leaderboard function (old app/portal/leaderboard
-- called supabase.rpc('leaderboard'); that function is not defined anywhere
-- in this repo). Safe if it does not exist.
drop function if exists public.leaderboard();

create or replace function public.get_leaderboard()
returns table (
  rank         int,
  trader       text,
  account_tag  text,
  plan_name    text,
  plan_type    text,
  capital      bigint,
  equity       bigint,
  net_pnl      bigint,
  return_pct   numeric,
  status       text,
  created_at   timestamptz,
  is_you       boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    row_number() over (
      order by
        (a.equity - p.capital)::numeric / nullif(p.capital, 0) desc nulls last,
        (a.equity - p.capital) desc,
        a.created_at asc,
        a.id asc
    )::int                                                             as rank,
    'Trader ' || upper(substr(md5(a.user_id::text), 1, 4))             as trader,
    'ACC-'    || upper(substr(md5(a.id::text), 1, 4))                  as account_tag,
    p.name                                                             as plan_name,
    p.plan_type                                                        as plan_type,
    p.capital                                                          as capital,
    a.equity                                                           as equity,
    (a.equity - p.capital)                                             as net_pnl,
    case
      when p.capital is null or p.capital = 0 then null
      else round((a.equity - p.capital)::numeric / p.capital * 100, 2)
    end                                                                as return_pct,
    a.status                                                           as status,
    a.created_at                                                       as created_at,
    (a.user_id = auth.uid())                                           as is_you
  from public.accounts a
  join public.plans p on p.id = a.plan_id
  where a.phase = 'funded'
    and a.status = 'active'
  order by
    (a.equity - p.capital)::numeric / nullif(p.capital, 0) desc nulls last,
    (a.equity - p.capital) desc,
    a.created_at asc,
    a.id asc
  limit 100
$$;

comment on function public.get_leaderboard() is
  'Anonymised funded-account performance leaderboard. SECURITY DEFINER so it '
  'can aggregate across traders while RLS on accounts/profiles stays intact. '
  'Returns no PII. Eligibility: phase = funded AND status = active.';

grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.get_leaderboard() to anon;
