# FundedDesk project analysis

## Scope and baseline

This is a JavaScript-only Next.js 14.2.5 App Router prototype for a simulated prop-trading evaluation product. The audit covered all tracked source/configuration/SQL files (6,812 source lines). `node_modules/` and `.next/` are generated dependency/build output, not application source. No `app/api` route handlers, server actions, test suite, lint script, CI configuration, or checked-in Angel relay service exist.

## Folder and project structure

| Location | Purpose | Assessment |
|---|---|---|
| `app/` | App Router pages, layouts and global CSS | Primary UI layer; almost every feature is implemented in page-sized client components. |
| `app/portal/` | Logged-in portal shell and portal features | Contains duplicated layouts and the current Angel terminal. |
| `app/portal/portal/` | Nested duplicate portal layout | Adds a second shell for `/portal/portal/*`; it differs from the parent and links its terminal to `/india`. |
| `app/india/` | Stand-alone, older Angel terminal route | Near-duplicate of the portal terminal. |
| `app/terminal/` | Older crypto terminal | Binance REST/WebSocket plus Supabase tables not present in the included schema. |
| `components/` | Shared navigation, theme and ambient background | Only three shared components; feature UI is not componentized. |
| `lib/` | Shared client utilities | `supabaseClient.js` creates a browser Supabase client and supplies currency formatting. |
| `supabase/` | Manual SQL setup/migration scripts | Base schema is incomplete for several current frontend calls. |
| `public/` | Static assets | Empty. |
| `'{app/'` | Stray literal-named, empty-looking directory tree | Likely accidental artifact; investigate before removal. |
| `.next/` | Next development/build output | Generated; should not be architectural source of truth. |

Top-level configuration is minimal: `next.config.mjs` is empty, `jsconfig.json` sets the `@/` alias, and `package.json` has only `dev`, `build`, and `start` scripts.

## Routes and components

| Area | Files/components | Responsibilities |
|---|---|---|
| Root shell | `app/layout.js`, `app/globals.css` | Metadata, Google fonts, universal `Nav`, `SiteBackground`, `ThemeToggle`, disclosure footer, global tokens/classes. |
| Marketing | `/`, `/about`, `/faq`, `/rules`, `/blog`, `/blog/[slug]` | Mostly static content. Home is a 1,168-line client page containing pricing UI and custom canvas/SVG animation components (`NeuralSphere`, `ScrollPath`, `LiveCandles`, `SaturnScene`, etc.). `rules/landing-page-v9-stickyfix.js` is an orphan alternate landing implementation, not imported by `/rules/page.js`. |
| Identity | `/signup`, `/login`, `Nav` | Supabase email/password signup/sign-in, session display and local sign-out. No reusable auth guard. |
| Challenge/operations | `/challenges`, `/dashboard`, `/admin` | Plan selection/manual UTR order creation; account/order/trade/payout views; admin approval and manual account/trade/payout operations. |
| Portal | `/portal`, `/portal/accounts`, `/portal/payouts`, `/portal/settings`, `/portal/leaderboard` | Account dashboard, equity chart, filtering, payout request, profile editing, RPC leaderboard. Analytics/affiliate/coupons/support/privacy are `ComingSoon` placeholders. |
| Terminals | `/terminal`, `/india`, `/portal/terminal` | Three incompatible terminal implementations; see dedicated sections. |
| Shared components | `Nav`, `ThemeToggle`, `SiteBackground` | Navigation/auth-aware links; persisted light/dark selection; two continuous canvas animations. |

All pages except static content are marked `'use client'`. The app therefore largely bypasses server rendering/data loading and ships substantial page code to the browser. UI styles are a combination of `globals.css`, per-page inline style objects, and template-string CSS in landing pages.

## Dependencies

| Dependency | Used for | Notes |
|---|---|---|
| `next` 14.2.5 | Routing/build/runtime | App Router, but no server API implementation. |
| `react`, `react-dom` 18.3.1 | UI/hooks | Local component state only. |
| `@supabase/supabase-js` 2.45.0 | Auth/PostgREST/RPC | Browser anon client; no SSR/service-role layer. |
| `lightweight-charts` ^4.2.0 | Candlestick and area charts | Instantiated imperatively in effects. |
| `lucide-react` ^0.383.0 | Icons | Used in portal, theme, and terminals. |

No validation, query-cache, form, test, error-monitoring, WebSocket-reconnection, payment, or Angel SDK package is installed.

## Data model, state, and security

Included SQL defines `profiles`, `plans`, `orders`, `accounts`, `trades`, and `payouts`, a profile-creation trigger, `is_admin()`, and RLS policies. The normal lifecycle is signup -> profile trigger -> order -> admin creates account/approves order -> admin records trade or user requests payout.

State is entirely `useState`/`useRef` scoped to each page. Refs are used to avoid stale values in timers, drawing handlers, and legacy WebSocket callbacks. Session state is independently fetched in many components; there is no auth context, domain store, request cache, normalized data model, or shared error/loading policy. Theme is duplicated between `ThemeToggle` and `app/portal/portal/layout.js`; `localStorage` is the only persistent client state besides Supabase auth.

RLS is a good baseline for the six defined tables, but business invariants remain client controlled: an admin browser generates account IDs and writes equity/status in separate calls; payout amount is computed in the browser; order approval is non-transactional. The base schema does not define columns used by the UI (`orders.eval_type`, `orders.fee_amount`) or tables/functions used by current routes (`instruments`, `positions`, `close_position`, `leaderboard`). Those flows cannot work against only `schema.sql`.

## APIs and integrations

### Supabase

The client calls Auth (`getSession`, `onAuthStateChange`, `signUp`, `signInWithPassword`, local `signOut`), CRUD on all six defined tables, plus the undeclared tables/functions above. There are no Next API routes, so each data request goes from the browser straight to Supabase and RLS is the authorization boundary.

### Angel One integration

`/india` and `/portal/terminal` label their feed “LIVE · ANGEL” but do **not** integrate with Angel One directly. Both hard-code `http://localhost:5001` and expect an external relay with:

| Relay endpoint | Consumer expectation |
|---|---|
| `GET /api/health` | JSON health result; failure marks relay unavailable. |
| `GET /api/chain?u=NIFTY|BANKNIFTY` | Expiry, lot, spot, ATM, option rows/tokens and current prices. |
| `GET /api/history?exch=NSE|NFO&token=…&interval=…` | Candle array consumable by Lightweight Charts. |
| `GET /api/ltp?…` (inferred from polling code) | Latest prices for watchlist/positions. |

The relay source, deployment configuration, credentials, CORS policy, authentication, contract tests, and production URL are absent. Because browsers cannot reach another user’s `localhost`, this cannot operate after deployment. The terminal itself is simulated: orders and positions live only in React memory and reset on refresh.

### External market APIs

The legacy `/terminal` fetches Binance kline REST history and uses a Binance `@kline_1m` WebSocket. It creates Supabase positions and calls `close_position`, so it is a separate crypto-oriented design from Angel options.

## WebSocket implementation

There is exactly one explicit browser WebSocket: `/terminal` opens `wss://stream.binance.com:9443/ws/{feed_symbol}@kline_1m` for the selected instrument. Its cleanup closes the socket and removes its chart. It has no connection-status UI, reconnect/backoff strategy, heartbeat, malformed-message protection, or resilient recovery. SL/TP evaluation is only performed for the currently selected instrument, so positions on other instruments are not monitored by this browser instance. Angel routes use 1.5-second HTTP polling instead of a WebSocket; the relay may use Angel streaming internally, but that is not inspectable in this project.

## Chart and rendering implementation

`lightweight-charts` is used in three ways: `/portal` builds an area/equity series from trade history; `/terminal` renders Binance candles; Angel terminal pages render relay candles and update the most recent candle from polling. Chart lifecycle is effect-based with removal cleanup. Resizing is handled by window resize on the legacy terminal and `ResizeObserver` in Angel pages.

The newer portal terminal adds a canvas overlay for cursor, trend line, horizontal line, rectangle and text annotations. It stores drawings per chart key in React state, converts via Lightweight Charts time/price coordinate APIs, redraws on resize and visible-range change, supports selection/move/resize/delete and keeps an in-memory undo history. `/india` is an older, less capable duplicate using pixel-oriented drawing state. Both terminal pages own fixed risk limits (`₹10L`, daily `₹50k`, max `₹100k`) instead of reading the user/account plan.

Rendering risks: `SiteBackground` runs two fixed canvases globally on every route; many heavyweight page components and inline style objects render client-side; no image optimization/static assets are used; public dashboard layout plus root navigation can overlap in responsibility; and the 1,012-line terminal is difficult to optimize or test in isolation.

## Primary findings

1. The repository represents multiple generations of the product, not one coherent runtime: legacy `/dashboard` and `/terminal`, newer `/portal`, and two Angel terminal copies coexist.
2. Current frontend requirements exceed the checked-in database contract.
3. Angel One is an undocumented local relay dependency, not a deployable in-repo integration.
4. Market/order/risk logic is client-side and non-persistent in the Angel terminal; it is unsuitable as an authoritative trading/evaluation engine.
5. Auth/authorization and business flows need server-side orchestration and transactions before production use.
6. There are no automated tests or quality gates.
