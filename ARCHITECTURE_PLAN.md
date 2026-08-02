# Target architecture plan

## Objective

Converge FundedDesk into one deployable simulated-options platform with a clear boundary between browser UI, trusted application logic, persistent evaluation data, and market-data providers. This is a target design, not implementation work.

## Proposed architecture

```text
Next.js UI (server-first pages + isolated client widgets)
        |
        v
Next.js route handlers / server actions (authz, validation, orchestration)
        |                         |
        v                         v
Supabase Postgres/Auth       Market-data service (Angel One adapter)
  - migrations/RLS             - server-held credentials
  - RPCs for atomic risk       - REST history + streamed ticks
  - audit records              - normalized symbols/candles
        |                         |
        +----------> Realtime/event channel <----------+
                         |
                         v
                 Browser terminal + Lightweight Charts
```

## Boundaries and responsibilities

| Layer | Responsibilities | Must not do |
|---|---|---|
| Pages/layouts | Route composition, metadata, protected-route redirect boundary | Own market/risk/business workflows. |
| Feature components | Presentation and local interaction state | Directly mutate protected records. |
| Client data hooks | Session-aware reads, cached queries, subscriptions, UI mutation state | Contain provider credentials or duplicate domain rules. |
| Next server layer | Validate inputs, check roles/account ownership, invoke transactions, mask provider failures | Trust browser-calculated payout, risk, or status values. |
| Domain services | Account lifecycle, order approval, positions, mark-to-market, SL/TP and breach rules | Be coupled to React or chart code. |
| Market-data adapter | Angel authentication/token lifecycle, instruments, candles, subscriptions, reconnection/rate limits | Be reachable from the browser with credentials. |
| Supabase | Source of truth, RLS defense-in-depth, migrations and audit trail | Depend on undocumented client-only schema. |

## Route and UI consolidation

Use `/portal` as the canonical authenticated product namespace. Retire or redirect `/dashboard`, `/terminal`, `/india`, and `/portal/portal`; retain one `PortalShell`. Keep marketing routes separate. Split large screens into feature folders, such as `features/terminal/{TerminalShell,ChartPanel,DrawingLayer,OptionChain,OrderTicket,PositionsTable,useMarketData,useDrawings}` and `features/accounts/`.

The portal dashboard should become an account overview. Terminal should select an active account and derive risk limits from its plan. The same auth provider, route guard, loading state, and theme provider should serve every authenticated route.

## Data model plan

Manage schema exclusively through ordered, idempotent migrations. First reconcile existing UI schema: add/order `eval_type` and `fee_amount`, then decide whether they belong in `plans`/`order_items` rather than mutable client values. Define missing `instruments`, `positions`, position events, candle cache (if retained), and `leaderboard` RPC/view. Add check constraints/enums, foreign-key indexes, unique account/login constraints, timestamps, and an immutable audit/event table.

Move these operations into transactional RPCs or server-side database functions: approve order/create account, open simulated position, close/mark position, update plan phase, reset day, request payout, and process payout. Each must validate actor role/ownership and emit an audit event. RLS remains enabled on every table, with least-privilege policies and no client-side administrative authority beyond invoking approved server workflows.

## Market-data and WebSocket plan

Build the Angel relay as an owned deployable service or a server-only module, with documented environment variables, health/readiness checks, authentication, CORS, structured logs, backoff, rate limiting, and a typed endpoint contract. Browser clients should subscribe to a normalized application feed (SSE/WebSocket/Supabase Realtime) rather than polling a hard-coded local URL. The adapter alone connects to Angel’s API/WebSocket and handles session refresh, subscription aggregation, reconnect, duplicate/out-of-order ticks, and provider outages.

Use a single market data interface: `getHistory(instrument, timeframe)` and `subscribeQuotes(instruments, callback)`. This makes Binance a removable development adapter rather than a competing product terminal. Persist enough price/position event data to make risk and account equity reproducible after refresh or server restart.

## Rendering and chart plan

Keep Lightweight Charts inside a client-only `ChartPanel` with a stable chart instance, one resize observer, and explicit subscription cleanup. Make drawing objects typed, chart-keyed, and persisted only if product requirements demand it. Separate visual overlays from position/risk calculations. Lazy-load terminal/chart code and respect reduced-motion; scope decorative canvases to marketing pages or make them opt-in.

## Delivery gates

1. A single schema migration chain can create a usable empty environment.
2. Every protected operation is validated and authorized on the server.
3. One terminal works after a production deployment without localhost dependencies.
4. Account, position, and breach state survives refresh and is auditable.
5. Unit/integration/E2E coverage protects risk, auth, and terminal lifecycle paths.
