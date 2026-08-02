# Refactor plan

## Guiding constraints

Preserve the current prototype’s public experience while eliminating duplicate routes and unsafe client authority. Do not combine visual refactoring with database/market-data changes in one release. Each phase should ship behind a route/feature flag or with a clear rollback path.

## Phase 0 — establish a safe baseline

- Record the deployed behavior and required user journeys: signup, buy challenge, admin approval, portal, terminal, payout.
- Add linting, formatting, type checking (prefer TypeScript for new modules), unit tests, E2E smoke tests, and CI before structural changes.
- Create `.env.example` covering Supabase and the eventual market-data service; ensure secrets are not browser-exposed.
- Confirm why `'{app/'` exists and whether it is generated/accidental before deleting it.

## Phase 1 — reconcile contracts and security

- Create migrations that match every existing frontend query before changing UI. Explicitly address `orders.eval_type`, `orders.fee_amount`, `instruments`, `positions`, `close_position`, and `leaderboard`.
- Replace multi-request browser workflows with server/RPC transactions. Order approval must not create duplicate accounts if retrying; payout and position operations must calculate trusted values on the server.
- Define plan/risk semantics once; remove hard-coded ₹10L limits from the Angel terminal.
- Add domain-level error codes and user-safe error handling.

## Phase 2 — consolidate shell and identity

- Introduce one auth/session provider and protected-route boundary.
- Retain `app/portal/layout.js` as the only portal shell; remove the nested duplicate only after redirecting/migrating its consumers.
- Standardize `/portal` destinations, then redirect legacy `/dashboard`, `/terminal`, and `/india` after feature parity.
- Consolidate duplicated logout and theme behavior into shared utilities/providers.

## Phase 3 — make one terminal

- Select the newer `/portal/terminal` UX as the starting point because it has better drawing coordinate handling, retry logic, and fullscreen support.
- Extract chart, overlay/drawings, option chain, watchlist, order ticket, risk summary, and positions into components/hooks.
- Remove `/india` only once the canonical route has identical required behavior. Retire `/terminal` or make its provider an explicit development adapter; do not maintain Binance and Angel as independent production terminals.
- Persist positions and delegated risk decisions; implement a visible feed connection state and reconnection strategy.

## Phase 4 — rendering and content cleanup

- Split the landing page and its orphan alternative into small presentational components; delete the unused alternate only after confirming its absence from links/release needs.
- Move inline styles toward co-located CSS modules or a deliberate design system; keep global tokens in `globals.css`.
- Lazy-load chart/terminal code and restrict canvas effects to pages where they add value.
- Replace placeholder pages deliberately: retain as honest feature-gated screens or remove nav entries.

## Phase 5 — harden and operate

- Add observability for auth failures, relay health, chart/feed errors, transaction errors, and breach events.
- Add rate limits, CSP, provider outage behavior, data-retention/audit policy, and backup/restore procedures.
- Run security review of RLS, role mutation, payment/UTR handling, and sensitive personal data before any real-money launch.

## Explicit dependencies between phases

Schema/API reconciliation precedes terminal persistence; terminal consolidation precedes route removal; server-side market adapter precedes production deployment. Visual componentization can proceed in parallel only when it does not alter these contracts.
