-- ============================================================
-- Trade submission idempotency  ·  Batch 23  ·  additive
--
-- CONTEXT (Phase 16 → Phase 17 → Phase 17 review fix)
--   Phase 16's product-definition audit (locked decisions, restated here
--   for traceability):
--     Q1 — two genuinely separate trades MAY legitimately share identical
--          account_id + instrument + side + pnl. No uniqueness constraint
--          may ever be built on those business fields.
--     Q2 — a retry of the SAME intentional submission must NOT create a
--          second trade. This requires explicit request-level idempotency,
--          not content-based deduplication.
--     Q3 — a new submission with identical visible fields may be
--          legitimate; it must only ever be WARNED about, never blocked.
--     Q6 — protection must ultimately exist at the database level, not
--          only in application code (see supabase/trade-write-hardening.sql,
--          Batch 24, for the companion migration that removes the direct
--          write paths this idempotency mechanism would otherwise sit
--          behind).
--
-- DEPLOYMENT STAGE: A of A/B/C (Phase 17 review fix)
--   This file is STAGE A only. It is purely additive — it does NOT drop or
--   otherwise disturb the Batch 22 4-argument admin_add_trade, so the
--   currently-deployed frontend (whatever it is at the moment this file is
--   applied) keeps working unmodified throughout. The two functions
--   coexist as genuinely distinct Postgres catalog entries (different
--   argument lists = different functions, not an ambiguous overload —
--   PostgREST resolves an RPC call to the exact function whose parameter
--   names match the request body), so there is no window where any
--   currently-deployed caller — old or new — can fail with "function not
--   found."
--     STAGE A (this file): add request_id column/index, create the NEW
--       5-argument admin_add_trade, leave the OLD 4-argument one alone.
--     STAGE B (no SQL): deploy the frontend that calls the 5-argument
--       version (already done in the repository — app/admin/page.js calls
--       admin_add_trade with p_request_id); confirm via logs/monitoring
--       that nothing is calling the 4-argument version anymore.
--     STAGE C (supabase/trade-idempotency-cutover.sql, applied only after
--       Stage B is confirmed): drops the old 4-argument function, then
--       supabase/trade-write-hardening.sql closes the direct-write bypass.
--   Do not apply trade-idempotency-cutover.sql until Stage B is confirmed.
--
-- WHAT THIS FILE DOES
--   1. Adds a nullable `request_id uuid` column to public.trades. Existing
--      historical rows get NULL — nothing is backfilled or fabricated
--      (a fabricated historical UUID could never collide with anything
--      meaningful, but it also could never carry real idempotency
--      information, so there is no reason to invent one).
--   2. Adds a UNIQUE index on request_id, scoped to non-null values only
--      (`where request_id is not null`) — this is the exact pattern
--      already used for orders in billing-hardening.sql's
--      uq_orders_pending_dupe, for the same reason: many existing rows
--      legitimately have no value for the key column, and a plain unique
--      index already treats multiple NULLs as non-conflicting in Postgres,
--      but the partial form documents that intent explicitly and avoids
--      indexing rows that will never participate in the uniqueness check.
--   3. Creates a NEW 5-argument admin_add_trade that requires a caller-
--      supplied p_request_id and implements idempotent replay, alongside
--      (not replacing) the existing 4-argument one — see the deployment
--      stage note above for why the old one is deliberately left in place
--      here and retired in a later, separate file instead.
--
--   NEW parameters and NEW columns are additive; this migration does not
--   rewrite, reorder, or alter any existing trades row's pnl, traded_at,
--   instrument, side, account_id, or id.
--
-- IDEMPOTENCY / RACE-SAFETY DESIGN
--   The database (a unique index), not the client, is the source of truth
--   for "has this request already been applied." The function:
--     1. checks public.is_admin() (unchanged from Batch 22)
--     2. validates inputs including the new p_request_id (must be non-null)
--     3. does a pre-check SELECT by request_id — if a trade with this
--        request_id already exists, returns its trade_id/equity with
--        idempotent_replay = true and performs NO further mutation
--     4. otherwise locks the account row (SELECT ... FOR UPDATE, unchanged
--        from Batch 22) and attempts the trade INSERT
--     5. if that INSERT raises unique_violation (a concurrent call with
--        the SAME request_id won the race between step 3's SELECT and
--        this INSERT), the exception is caught, the winning row is
--        re-selected, and it is returned as a replay — exactly like step 3
--     6. only a genuinely new (never-before-seen) request_id reaches the
--        equity update and audit log
--
--   The pre-check (step 3) is an optimization — it lets a true replay skip
--   taking the account lock entirely, so a flood of retries for an
--   already-applied request never contends for that lock. Correctness
--   does NOT depend on the pre-check alone: the unique index is the actual
--   guarantee, enforced by Postgres at the moment of INSERT regardless of
--   how two concurrent transactions interleave. This is why step 5's
--   exception handler exists — it is the real race-safety backstop, not a
--   redundant convenience.
--
-- WHAT IS EXPLICITLY OUT OF SCOPE (unchanged from Batch 22's own scope
-- notes, still true here):
--   - No uniqueness rule is placed on account_id/instrument/side/pnl — see
--     Q1 above. A "possible duplicate" warning based on those fields is
--     implemented in the application (app/admin/page.js), as a read-only,
--     overridable heuristic — it never participates in this function's
--     idempotency decision and cannot itself cause a second mutation.
--   - Trade correction/reversal/edit/delete is NOT implemented here — a
--     replay never modifies an existing trade row, it only reports on it.
-- ============================================================

alter table public.trades add column if not exists request_id uuid;

create unique index if not exists uq_trades_request_id
  on public.trades (request_id)
  where request_id is not null;

-- The Batch 22 4-argument admin_add_trade is deliberately left untouched
-- here — see the deployment-stage note at the top of this file. It is
-- retired later, in supabase/trade-idempotency-cutover.sql, only after
-- Stage B confirms nothing calls it anymore. `create or replace` below
-- cannot collide with it: a different argument list is a different
-- function in Postgres, so this statement can only ever create a NEW
-- catalog entry, never touch the old one.
create or replace function public.admin_add_trade(
  p_account_id uuid,
  p_instrument text,
  p_side text,
  p_pnl bigint,
  p_request_id uuid
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

  if p_request_id is null then
    raise exception 'request_id is required';
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

  -- Idempotent-replay pre-check — before taking any lock, so a replay of
  -- an already-applied request never blocks behind, or is blocked by,
  -- another admin's unrelated concurrent trade on the same account.
  select * into v_trade from public.trades where request_id = p_request_id;
  if found then
    select equity into v_new_eq from public.accounts where id = v_trade.account_id;
    perform public.log_admin_action(
      'trade.add.replay', 'trades', v_trade.id,
      jsonb_build_object('request_id', p_request_id)
    );
    return jsonb_build_object(
      'trade_id', v_trade.id, 'equity', v_new_eq, 'idempotent_replay', true
    );
  end if;

  -- Row lock held for the rest of this transaction — a concurrent call
  -- against the same account_id blocks here until this transaction
  -- commits or rolls back, then reads the equity THIS call just wrote.
  select * into acc from public.accounts where id = p_account_id for update;
  if not found then
    raise exception 'account not found';
  end if;

  begin
    insert into public.trades (account_id, instrument, side, pnl, request_id)
    values (p_account_id, upper(trim(p_instrument)), p_side, p_pnl, p_request_id)
    returning * into v_trade;
  exception when unique_violation then
    -- A concurrent call with the SAME request_id won the race between the
    -- pre-check SELECT above and this INSERT. Re-select the winner's row
    -- and return it as a replay — no second trade, no second equity
    -- update, regardless of which call actually reaches this point first.
    select * into v_trade from public.trades where request_id = p_request_id;
    select equity into v_new_eq from public.accounts where id = v_trade.account_id;
    perform public.log_admin_action(
      'trade.add.replay', 'trades', v_trade.id,
      jsonb_build_object('request_id', p_request_id, 'race', true)
    );
    return jsonb_build_object(
      'trade_id', v_trade.id, 'equity', v_new_eq, 'idempotent_replay', true
    );
  end;

  v_new_eq := acc.equity + p_pnl;
  update public.accounts set equity = v_new_eq where id = p_account_id;

  perform public.log_admin_action(
    'trade.add', 'trades', v_trade.id,
    jsonb_build_object(
      'account_id', p_account_id, 'instrument', v_trade.instrument,
      'side', p_side, 'pnl', p_pnl, 'new_equity', v_new_eq,
      'request_id', p_request_id
    )
  );

  return jsonb_build_object(
    'trade_id', v_trade.id, 'equity', v_new_eq, 'idempotent_replay', false
  );
end;
$$;

revoke execute on function public.admin_add_trade(uuid, text, text, bigint, uuid) from public;
revoke execute on function public.admin_add_trade(uuid, text, text, bigint, uuid) from anon;
grant  execute on function public.admin_add_trade(uuid, text, text, bigint, uuid) to authenticated;

comment on function public.admin_add_trade(uuid, text, text, bigint, uuid) is
  'Admin-only atomic trade insert + equity update + request-level '
  'idempotency (Batch 23). Coexists temporarily with the Batch 22 '
  '4-argument admin_add_trade until supabase/trade-idempotency-cutover.sql '
  'retires it (deployment Stage C). A retried call with the same '
  'p_request_id returns the original trade (idempotent_replay=true) and '
  'performs no new mutation. Does NOT deduplicate on '
  'account_id/instrument/side/pnl — see Phase 16 Q1.';
