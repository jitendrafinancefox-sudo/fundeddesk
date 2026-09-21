-- ============================================================
-- Missing hot-path indexes  ·  Batch 25  ·  additive, non-transactional
--
-- AUDIT FINDING (Phase 18, P0-1)
--   Re-verified this phase (Phase 19) directly against the current
--   repository/migration state, not assumed from the Phase 18 report:
--   grepped every `create index`/`create unique index` statement across
--   all SQL files in supabase/ and confirmed neither public.trades nor
--   public.accounts has ever had an index on the column every hot read
--   path filters by:
--     - public.trades.account_id — filtered by every portal dashboard
--       query, the account-detail page, the analytics page,
--       hooks/useAccountRisk.js, and (until Batch 26) the admin
--       reconciliation scan.
--     - public.accounts.user_id — filtered by every accounts list read
--       (PortalDataProvider) and is the predicate every "own row" RLS
--       policy on accounts/trades/payouts ultimately joins through.
--   Every other heavily-filtered foreign key in this schema already has
--   one (idx_orders_user_created, idx_notifications_user_created/unread,
--   idx_soft_breaches_account_id, idx_support_tickets_user_created) —
--   trades and accounts were the two exceptions.
--
-- WHY CREATE INDEX CONCURRENTLY
--   Both tables are expected to grow large in production. A plain
--   `CREATE INDEX` takes an ACCESS EXCLUSIVE-adjacent lock for the
--   duration of the build (blocks writes to the table); CONCURRENTLY
--   builds the index without blocking concurrent reads/writes, at the
--   cost of taking longer and requiring two table scans internally.
--   This is the correct choice for a migration applied to a live,
--   already-serving-traffic production table.
--
-- IMPORTANT — DO NOT RUN THIS INSIDE A TRANSACTION BLOCK
--   `CREATE INDEX CONCURRENTLY` cannot execute inside a transaction
--   (Postgres will reject it with "CREATE INDEX CONCURRENTLY cannot run
--   inside a transaction block"). Do not wrap the two statements below in
--   BEGIN/COMMIT, and do not paste them into a SQL client/tool that
--   silently wraps a whole pasted script in one implicit transaction.
--   Apply each statement as its own top-level execution if your tool
--   auto-wraps pasted scripts; the plain Supabase SQL Editor does not.
--
-- SAFETY
--   - Additive only: creates two indexes, nothing else. No column, no
--     row, no constraint, no RLS policy, no grant is touched.
--   - `if not exists` makes each statement safe to re-run (a second run
--     is a no-op once the index exists).
--   - Fully reversible: `DROP INDEX CONCURRENTLY idx_trades_account_id;`
--     / `DROP INDEX CONCURRENTLY idx_accounts_user_id;` removes either
--     independently, at any time, with no data loss (see the file's own
--     rollback note in the Phase 19 report).
--   - Naming follows the exact existing convention in this schema
--     (`idx_<table>_<column>`, e.g. idx_soft_breaches_account_id,
--     idx_orders_user_created) — verified no name collision this phase.
-- ============================================================

create index concurrently if not exists idx_trades_account_id
  on public.trades (account_id);

create index concurrently if not exists idx_accounts_user_id
  on public.accounts (user_id);
