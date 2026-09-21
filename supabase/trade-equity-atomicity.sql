-- ============================================================
-- Trade insert + equity update atomicity  ·  Batch 22  ·  additive
--
-- AUDIT FINDING (Phase 13)
--   app/admin/page.js's addTrade() previously performed two independent
--   database operations from the browser:
--     1. INSERT into public.trades
--     2. UPDATE public.accounts SET equity = <client-computed value>
--   with the new equity value computed in JavaScript as
--   `acc.equity + pnl`, where `acc.equity` is whatever the admin's last
--   page load happened to fetch — NOT read fresh inside a transaction.
--
--   This is a classic read-modify-write race: if two addTrade() calls run
--   concurrently against the SAME account (two admin tabs/sessions, or two
--   admins), both can read the same stale `acc.equity`, and whichever
--   UPDATE lands second silently overwrites the first — the trade row from
--   the first call is still correctly inserted into public.trades, but its
--   contribution to accounts.equity is lost. lib/riskEngine.js's
--   reconcileAccountEquity() would eventually surface the resulting drift
--   as an EQUITY_RECONCILIATION_MISMATCH warning, but only diagnostically —
--   it never repairs anything, and nothing forced an admin to look at it.
--
--   Separately, log_admin_action() was called as a THIRD, independent
--   request after both writes — so a failure between steps could also
--   leave a trade/equity change with no audit row at all.
--
-- FIX
--   A single SECURITY DEFINER function that performs authorization, the
--   trade insert, the equity mutation, and the audit log inside ONE
--   Postgres transaction — mirroring the exact pattern every other
--   money-flow RPC in this repo already uses (admin_approve_order,
--   admin_set_account_status): `select ... for update` locks the account
--   row for the duration of the transaction, so a second concurrent call
--   against the same account blocks until the first commits, then reads
--   the ALREADY-UPDATED equity — the lost-update race is structurally
--   impossible once both trades reach this function, and either both
--   writes happen or neither does (a failure mid-transaction rolls back
--   the trade insert too, so trades and equity can never drift apart from
--   a partial failure of this specific operation again).
--
-- EXPLICITLY OUT OF SCOPE (Phase 13 audit conclusion, not fixed here):
--   - Duplicate-submission protection. There is no evidence-backed way to
--     define a uniqueness key for public.trades from the current schema
--     (id, account_id, instrument, side, pnl, note, traded_at) without a
--     product decision about what "the same trade" means — two genuinely
--     different real trades can legitimately share every one of those
--     column values. This function does not attempt idempotency; a retried
--     submission after a timeout can still create a second, real trade
--     row. See the Phase 13 report for the full reasoning.
--   - created_by / per-trade actor attribution. admin_actions.admin_id
--     already identifies which admin called this function for each
--     trade.add event (this function passes the new trade's own id as the
--     audit row_id, unlike the old code which passed the account id) —
--     whether that is sufficient or a dedicated column is wanted is a
--     product decision, not made here.
--   - This function does NOT revoke the existing "trades admin write" /
--     "accounts admin all" RLS policies, which still permit an admin to
--     issue the old two-step raw insert+update directly (e.g. via the
--     Supabase client in devtools) and reintroduce the same race. RLS is
--     unchanged because those policies are not themselves incorrect, and
--     accounts.update is still legitimately used elsewhere (phase changes,
--     day_start_equity resets) outside this function. The fix here is
--     "give the app one correct, atomic path and use it," not "forbid the
--     old path at the database level" — narrower, and reversible without
--     any RLS change if this function ever needs to be revised.
-- ============================================================

create or replace function public.admin_add_trade(
  p_account_id uuid,
  p_instrument text,
  p_side text,
  p_pnl bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acc      public.accounts%rowtype;
  v_trade  public.trades%rowtype;
  v_new_eq bigint;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_side not in ('BUY', 'SELL') then
    raise exception 'invalid side';
  end if;
  if p_instrument is null or length(trim(p_instrument)) = 0 then
    raise exception 'instrument is required';
  end if;
  if p_pnl is null then
    raise exception 'pnl is required';
  end if;

  -- Row lock held for the rest of this transaction — a concurrent call
  -- against the same account_id blocks here until this transaction
  -- commits or rolls back, then reads the equity THIS call just wrote.
  select * into acc from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'account not found';
  end if;

  insert into public.trades (account_id, instrument, side, pnl)
  values (p_account_id, upper(trim(p_instrument)), p_side, p_pnl)
  returning * into v_trade;

  v_new_eq := acc.equity + p_pnl;
  update public.accounts set equity = v_new_eq where id = p_account_id;

  perform public.log_admin_action(
    'trade.add', 'trades', v_trade.id,
    jsonb_build_object(
      'account_id', p_account_id, 'instrument', v_trade.instrument,
      'side', p_side, 'pnl', p_pnl, 'new_equity', v_new_eq
    )
  );

  return jsonb_build_object('trade_id', v_trade.id, 'equity', v_new_eq);
end;
$$;

revoke execute on function public.admin_add_trade(uuid, text, text, bigint) from public;
revoke execute on function public.admin_add_trade(uuid, text, text, bigint) from anon;
grant  execute on function public.admin_add_trade(uuid, text, text, bigint) to authenticated;

comment on function public.admin_add_trade(uuid, text, text, bigint) is
  'Admin-only atomic trade insert + equity update (Batch 22). Replaces the '
  'previous two-step insert-then-update from app/admin/page.js, which could '
  'lose an equity update under concurrent calls on the same account. Does '
  'NOT provide duplicate-submission protection — see file header.';
