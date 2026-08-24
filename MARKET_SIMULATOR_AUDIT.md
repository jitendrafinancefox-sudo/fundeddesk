# MARKET_SIMULATOR_AUDIT.md

**Project:** fundeddesk (Next.js 15 + React 19, client-side terminal)
**Audit date:** 18 Aug 2026
**Scope:** Existing capability for a standalone NIFTY/BANKNIFTY options market-simulation terminal
**Status:** Read-only audit. No files were modified.

---

## 1. Angel One SmartAPI integration

There is **no direct SmartAPI code in this repository**. The terminal consumes a
**custom Angel One relay server** over plain HTTP + polling. The relay (which holds
the SmartAPI session, API keys, and any WebSocket to Angel) is an external process —
the default endpoint is `http://localhost:5001`.

| File | Symbol | What it does |
|---|---|---|
| `services/marketData.js` | `createMarketDataClient(baseUrl)` (line 10) | Builds the HTTP client that proxies the relay |
| `services/marketData.js` | `marketData.health()` (line 13) | `GET /api/health` — liveness + index spot |
| `services/marketData.js` | `marketData.optionChain(u)` (line 14) | `GET /api/chain?u=<underlying>` |
| `services/marketData.js` | `marketData.history(exch, token, interval)` (line 18) | `GET /api/history?exch=&token=&interval=` — unwraps `{candles:[...]}` or `[...]` |
| `services/marketData.js` | `marketData.ltp(tokens)` (line 20) | `GET /api/ltp?tokens=` — **defined but never called anywhere** |
| `services/marketData.js` | `marketData.heatmap(index)` (line 21) | `GET /api/heatmap?index=` — NIFTY/BANKNIFTY stock snapshot |
| `.env.local` | `NEXT_PUBLIC_ANGEL_RELAY_URL` (fallback `http://localhost:5001`) | The only Angel-related config in the repo |

**Data flow:** relay (Angel side) → `fetch` from the browser → unwrapped in
`marketData.js` → consumed by hooks/components/stores.

---

## 2. Where historical market data is fetched

Single endpoint, three consumers:

| File | Symbol | Usage |
|---|---|---|
| `components/chart/ChartCanvas.js` | effect at line 193-198 | `marketData.history(exchange, token, interval)` on mount/symbol/timeframe change → `normalizeCandles()` → `engine.setCandles(candles)` (custom canvas engine). Also emits `onPrice` (last close) and `onCandle` |
| `components/chart-tv/TVChart.js` | `_fetch(relayInterval)` (line 155) and `setCompareOverlay()` (line 263) | Fetches history with retry/backoff (`this._retries`), `this.setCandles(rows)`; compare overlay refetches a second symbol's history |
| `stores/TradingStore.js` | `pollIndicators()` (line 242) | Refetches `FIVE_MINUTE` candles every 15 s for indicator alerts (SMA/EMA/VWAP/RSI/MACD) |

Normalization: `services/candleAggregator.js` — `normalizeCandle` (line 1) handles
both array rows `[ts_ms, o, h, l, c, vol]` and object rows; `normalizeCandles` (line 6).

**Important:** the history API has **no from/to date range** — the relay decides the
window. The browser only ever asks "latest N candles of interval X for token Y".

---

## 3. Where live/WebSocket market data is fetched

**There is no WebSocket anywhere in the repo** (only a comment mentioning it as a
future possibility in `components/chart/ChartCanvas.js:31`). "Live" = HTTP polling:

| Poll | Cadence | File / Symbol | Endpoint |
|---|---|---|---|
| Option chain (active underlying only) | 1.5 s | `hooks/useMarketData.js` → `refreshChain()` (line 8) | `/api/chain?u=` |
| Index spot (NIFTY/BANKNIFTY) | 2 s | `components/chart-tv/LiveQuoteFeed.js` → `poll()` (line 29) | `/api/health` |
| Stock quotes (heatmap) | 15 s | `components/terminal/TerminalDataLayer.js` (line 33) and `app/tv-chart/page.js` (line 236) | `/api/heatmap?index=` |

## 4. Instrument / symbol / expiry / strike / CE-PE resolution

| File | Symbol | Role |
|---|---|---|
| `components/terminal/constants.js` | `INDEX_TOKEN` (line 7) | **Hardcoded** index tokens: `NIFTY: '99926000'`, `BANKNIFTY: '99926009'` |
| `services/marketData.js` | `allStockSymbols()` (line 30) | Builds stock universe (deduped) from the two heatmap calls — not a real instrument master |
| Relay `/api/chain` response | `chain.rows[]` | Everything else. Each row: `{strike, underlying, expiry, ceToken, peToken, ce, pe, ceBid/peBid, ceAsk/peAsk, ceOi/peOi, ceVol/peVol, ceIv/peIv, ceDelta/peDelta, ceGamma/peGamma, ceTheta/peTheta, ceVega/peVega, prevCe, prevPe}` |
| `components/terminal/TradingTerminal.js` | `selectContract()` (line 112), `itemToConfig()` (line 86) | Chain row → pane selection: `exchange='NFO'`, `chartMode='strike'`, `symbol = "<U> <strike> <CE|PE>"`, `selection={underlying, strike, type, token}` |
| `components/terminal/Watchlist.js` | search dropdown (line 125) | Searches the chain rows for options; heatmap universe for stocks |
| `app/tv-chart/page.js` | `watchItemToInstrument()` (line 491), `optionChainRows` (line 276) | Same mapping for the TV-chart page |

Contracts are never constructed locally — every token comes from the relay's
*current* chain. **There is no historical instrument map (past expiries are gone).**

## 5. Current candle/timeframe generation logic

| File | Symbol | What it does |
|---|---|---|
| `services/candleAggregator.js` | `aggregateTick(previous, tick, seconds)` (line 8) | Buckets a `{time, price}` LTP into a candle via `floor(tick.time/seconds)` |
| `services/candleAggregator.js` | `normalizeCandle(s)` (line 1) | Converts relay rows to `{time(sec), o, h, l, c, volume}` |
| `components/terminal/constants.js` | `TIMEFRAMES` (line 9) | `1m/3m/5m/15m/1h/4h/1D` ↔ Angel interval codes `ONE_MINUTE…ONE_DAY` |
| `components/chart-tv/TVChartSeries.js` | `resolveRelayInterval()` (line 24) | Maps TV labels ↔ relay codes |
| `app/tv-chart/page.js` | live-tick effect (line 580) | **Client-side candle building from LTP ticks**: buckets `PriceBus` LTPs into the current candle (`updateCandle`: in-bucket → high/low/close; new bucket → new candle at LTP; stale → ignored). Gated by `IS_MARKET_OPEN` |

So: historical candles are **server-aggregated** (relay returns already-binned
OHLCV per interval); the client only re-bins LTP snapshots into a live candle.

## 6. Tick-level or OHLC only?

**Candle-level + LTP snapshots. There are no true ticks.**

- History: OHLCV candles only (no underlying ticks inside them).
- "Live" data: LTP numbers (chain CE/PE LTP every 1.5 s, index spot every 2 s,
  stock LTP every 15 s). No trade prints, no bid/ask depth, no per-tick timestamps,
  no volume per tick.
- `aggregateTick` takes `{ time, price }` — i.e., it aggregates *LTP snapshots*,
  which the code calls ticks. 2s/1.5s/15s granularity max.

## 7. How market prices flow from the API into the chart

The central hub is `stores/PriceBus.js` — a tiny external store mapping
`token → { ltp, bid, ask, change, prevClose, ts }` with per-token subscriptions
(`PriceBus.set/get/subscribe/onAll`, `usePrice(token)`).

```
Relay HTTP polls
 │  chain 1.5s, health 2s, heatmap 15s
 ▼
TerminalDataLayer / tv-chart page / LiveQuoteFeed
 │  PriceBus.set(token, {ltp, ...})
 ▼
PriceBus (system-wide quote bus)
 ├─→ PaneManager.setPanePrice (header LTP readout)          [portal terminal]
 ├─→ TradingStore engine (PriceBus.onAll) → position MTM, SL/TP brackets, alerts
 ├─→ tv-chart live effect (PriceBus.onAll) → TVChart.updateCandle (chart candle ticks)
 ├─→ Watchlist / OrderBook / ScalperPanel / BuySellOverlay (display only)
 └─→ ChartCanvas onPrice → same pane price + bus (double-entry for live LTP)
```

ChartPane path (`components/terminal/ChartPane.js`): history fetch happens inside
`ChartCanvas` itself (it calls `marketData.history` directly, line 196) and reports
the last close via `onPrice` → `PaneManager.setPanePrice` (line 125) → updates the
pane price context AND pushes into `PriceBus`.

## 8. Chart engine / rendering files

Three chart stacks exist:

| Stack | Files | Engine | Where used |
|---|---|---|---|
| Custom canvas | `components/chart/ChartCanvas.js`, `components/chart/engine/*` (`CanvasChartEngine.js`, `RenderPipeline.js`, `CandleRenderer.js`, `coords/*` scales, `IndicatorCalculations.js`, `IndicatorEngine.js`), `components/chart/drawing/*`, `components/chart/renderers/*`, `components/chart/ui/*` | Hand-rolled canvas renderer with TradingView-style coordinates, full drawing suite (trend/channels/fib/brush/positions), indicators | `/portal/terminal` (main terminal) |
| Lightweight-charts wrapper | `components/chart-tv/*` (`TVChart.js`, `TVChartContainer.js`, `TVChartSeries.js`, `TVChartTheme.js`, `overlay/*`, `BuySellOverlay`, `EntryBar`, `InstrumentCard`, `levelPnl`) | `lightweight-charts` v5 (package.json line 19) with an HTML canvas overlay drawing system | `/tv-chart` page |
| v2 scaffold (third stack) | `app/web-terminal-v2/components/chart/*` (chart-canvas.tsx, scales, grid, crosshair, viewport) + `engine/chart/chart-instance.ts` + `stores/chart-store.ts` | Custom canvas, **UI-only** | `/web-terminal-v2` — dead end: `engine/broker/broker-adapter.ts` throws "not implemented"; zero market-data fetches (verified — no `marketData`/`fetch`/`api/` references in v2 besides supabase auth client) |

`package.json` also ships `highcharts` and `klinecharts` but nothing imports them
for the terminal (only chart-tv's lightweight-charts is in use).

## 9. Order execution / simulated order / position / P&L logic

All in **`stores/TradingStore.js`** (pure client-side paper trading; nothing touches
the broker or Supabase):

| Function | Line | Behaviour |
|---|---|---|
| `placeOrder()` | 298 | Margin check vs `account.available`; pending order → `fillOrder()` after 700 ms at live `PriceBus` LTP; fills create positions `{avgPrice=ltp, currentPrice=ltp, sl, tp, margin}` |
| `fillOrder()` | 478 | Execution at LTP |
| `startEngine()` | 204 | `PriceBus.onAll` handler: marks positions to market, fires SL/TP brackets per tick, triggers price/drawing alerts; indicator alerts poll 5-min history every 15 s |
| `settlePosition()` / `recordTrade()` | 191 / 167 | Realized P&L math `(exit - avgPrice) * dir * qty`; trade records |
| `closePosition / reversePosition / addQty / partialExit / modifyPosition` | 363-447 | Position management incl. weighted-average entries |
| `recomputeAccount()` | 136 | cash, usedMargin, available, free, equity, dailyPnl (resets per day via `dayLabel`) |
| Constants | 13-17 | `LOT_SIZES = {NIFTY:25, BANKNIFTY:35, FINNIFTY:40, MIDCPNIFTY:75, SENSEX:20}`, margin rates, `INITIAL_CASH = 200000` |
| Persistence | 59-107 | `localStorage` key `fundeddesk:trading-v1` |

UI consumed via `useTradeState(topic)` (line 505): `components/terminal/OrderPanel.js`
(form incl. order types, charges estimation, R/R preview), `PositionManager.js`,
`OrderManager.js`, `TradeHistory.js`, `RiskPanel.js`, `OrderBook.js`,
`AlertManager.js`. The `/tv-chart` page additionally draws entry/SL/TP level lines
and submits orders with `panelPrice()` fallback chain (PriceBus → last candle close
→ chain spot → chain row LTP).

## 10. Existing historical / replay / backtest / simulation functionality

| Item | Location | Reality |
|---|---|---|
| "Replay" | `components/terminal/ChartPane.js` lines 62-105 | **Cosmetic only**: walks a crosshair over already-loaded candles at 300 ms steps (button dispatches `fd:replay:toggle`). No data replay. |
| "Simulation" | whole terminal | Paper trading on **live** data (TradingStore). Marketing copy describes simulated capital (`components/SiteFooter.js:15`). |
| Backtest / historical replay | — | **None.** |
| Test harness | `scripts/phase7-stress.mjs` | Headless stress test of workspace `paneOps` (no market data) |

## 11. Database / storage for market data

**No market data is stored anywhere.**

- **Supabase** (`supabase/schema.sql`, plus `user-watchlist.sql`, `plans-3tier-fix.sql`, etc.): only business tables — `profiles`, `plans`, `orders` (UPI verification), `accounts` (phase1/phase2/funded), `trades` (admin-entered), `payouts`, `user_watchlist_items`. **No candles/ticks/instruments table.**
- **localStorage** only for client state:
  - `fundeddesk:trading-v1` (trading state — `stores/TradingStore.js:17`)
  - `terminal-panes` (workspace layout — `PaneManager.js:70`)
  - `fundeddesk:drawings:<chartKey>` (drawings — `services/drawingPersistence.js`)
  - `fundeddesk:tvchart:v1` (tv-chart instruments/intervals — `app/tv-chart/page.js:77`)
- React-Query client exists (`app/web-terminal-v2/services/query/client.ts`) but has **no queries** for market data.

## 12. Exact API response formats currently handled

| Endpoint | Response shape handled | Consumers |
|---|---|---|
| `GET /api/health` | `{ nifty: <number>, banknifty: <number> }` | `LiveQuoteFeed.js`, `useMarketData.js`, `tv-chart/page.js`, `StatusBar.js` |
| `GET /api/chain?u=<U>` | `{ spot, expiry, lot, atm, rows: [{strike, underlying, expiry, ceToken, peToken, ce, pe, ceBid, peBid, ceAsk, peAsk, ceOi, peOi, ceVol, peVol, ceIv, peIv, ceDelta, peDelta, ceGamma, peGamma, ceTheta, peTheta, ceVega, peVega, prevCe, prevPe}] }` (fields inferred from `OptionChainModal.js`, `Watchlist.js`, `TerminalDataLayer.js`, `tv-chart/page.js`) | `useMarketData`, `OptionChainModal`, `Watchlist`, `TradingTerminal`, `tv-chart` |
| `GET /api/history?exch=&token=&interval=` | Either `Array` of `[ts_ms, open, high, low, close, volume]` or `{ candles: [...] }` — `marketData.history` unwraps both | `ChartCanvas`, `TVChart`, `TradingStore` alerts |
| `GET /api/heatmap?index=<NIFTY\|BANKNIFTY>` | `Array` or `{ stocks: [...] }` — rows `{symbol, token, exch, ltp, bid, ask, dayChangePercent, prevClose}` | `TerminalDataLayer`, `tv-chart/page`, `app/portal/analytics/heatmap/page.js`, `allStockSymbols` |
| `GET /api/ltp?tokens=` | Defined client-side, **no consumer** — format unknown | — |
| Interval codes | `ONE_MINUTE, THREE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, ONE_HOUR, FOUR_HOUR, ONE_DAY` | everywhere |

---

# Assessment

## A. What can be reused

1. **`stores/PriceBus.js`** — token→quote bus with per-token subscriptions. Ideal tick sink for a replay engine (sim ticks just `PriceBus.set`).
2. **`stores/TradingStore.js`** — complete paper engine: margin, lot sizes, SL/TP brackets on ticks, P&L accounting, daily reset. Its only time dependency is `Date.now()` and the `PriceBus.onAll` hook — with an injected clock/tick source it IS the simulator's match engine.
3. **`services/candleAggregator.js`** — `normalizeCandle` / `aggregateTick` (tick→candle binning) directly reusable to build sim candles from 1-min or tick series.
4. **`components/chart/ChartCanvas.js` + `components/chart/engine/*`** — explicitly designed provider-neutral ("reused with replay, cached, WebSocket, or Angel relay data"); the only data call is one `marketData.history` invocation that must be converted to an injectable source.
5. **`components/chart-tv/*`** — lightweight-charts wrapper; `TVChart.setCandles` is imperative, so replay frames can be pushed straight in.
6. **`PaneManager` / `paneOps` / `ChartGrid` / `Workspace`** — pure workspace state, zero market-data coupling.
7. **`IndicatorCalculations.js` + `IndicatorEngine.js`** — indicator math over candle arrays; reusable for sim indicators.
8. **`components/terminal/constants.js`** — `INDEX_TOKEN`, `TIMEFRAMES`, `IS_MARKET_OPEN`.
9. **UI panels** — `Watchlist`, `OptionChainModal`, `OrderPanel`, `PositionManager`, `TradeHistory` render from plain props/stores; re-usable almost verbatim.
10. **`scripts/phase7-stress.mjs`** — the immutable-op/state-invariant harness pattern is directly applicable to a replay store.

## B. What is missing

1. **No tick/OHLC archive** — no database, no file store, nothing. The relay returns only a recent candle window.
2. **No date-range history API** — no `from/to` (`limit`) params anywhere; historical replay of arbitrary dates is impossible today.
3. **No replay/backtest engine** — no playback clock (play/pause/step/scrub/speed), no scenario definitions, no candle-driven fill logic.
4. **No data-source seam** — `ChartCanvas` and the live-tick effect call `marketData.history` / `PriceBus` directly; there is no interface to swap "relay" for "archive" or "sim time".
5. **No instrument master for expired series** — tokens for past expiries are unrecoverable from the current chain; a simulator needs any-day symbol→token mapping (Angel master contract).
6. **No expired-day chain data** — OI, IV, greeks per strike for past days are not retained (only live chain).
7. **TradingStore is wall-clock bound** — `Date.now()`/`today()` sprinkled through; needs a clock injection for replay.
8. **No serialization of sim sessions** — no tables (Supabase) or keys for scenario/result storage.
9. **No SmartAPI order path** — irrelevant for a *simulator*, but note the terminal itself is paper-only.

## C. Can the current Angel One integration support the simulator?

**Partially — for candle-level replay, not for tick-level.**

| Requirement | Supported today? |
|---|---|
| Historical OHLC candles per interval | ✅ Yes, but only the relay's default recent window; no explicit date pick |
| Reconstructing a day from 1-min candles | ⚠️ If the relay returns full 1-min history for the token (Angel's API supports date ranges), yes — currently unused |
| Candle-time-driven trading (fills at open/close/H/L of each candle) | ✅ Feasible with existing history + `aggregateTick` |
| Tick-level fills and intrabar SL/TP precision | ❌ No tick data archived; only 1.5–15 s LTP snapshots |
| Option universe for past dates | ❌ Chain only serves current strikes/expiry; no master history |
| Greeks/IV realism during replay | ❌ Not stored; would need chain snapshots or back-computed greeks |

The relay (not part of this repo) is the bottleneck: it already proxies Angel's
historical candles, so the **backfill capability exists on the Angel side** and only
needs an archiver to persist it.

## D. Is the current data tick-level or candle-level?

**Candle-level.** OHLCV candles for history; "live" is LTP snapshots (1.5 s chain /
2 s spot / 15 s stocks) — not tick-by-tick trade data. The code calls LTP snapshots
"ticks" (e.g., `aggregateTick`, `PriceBus.onAll`), but there is no trade stream,
depth, or sub-second data anywhere in the pipeline.

## E. What additional historical data is required

1. **Per-token date-ranged OHLC** — `history(exch, token, interval, from, to)` exposed through the relay (Angel supports it); start with 1-min for the two indices plus option tokens of interest.
2. **Day-level spot** — NIFTY/BANKNIFTY index candles (tokens `99926000`/`99926009`) with longs/volumes for every replay day.
3. **Instrument master history** — for each expiry: `{token, symbol, exchange, expiry, strike, CE/PE, lot size}` (Angel master contract snapshot per day, or derive dates from expiry lists).
4. **Option chain snapshots (optional but recommended)** — periodic (e.g., 5-min or EOD) chain dumps: OI, IV, delta/gamma/theta/vega, bid/ask, open-interest for realism; fallback = Black-Scholes reprice from spot at replay time.
5. **Tick archive (optional, for tick-accurate sim)** — record Angel WebSocket ticks for the index + active option strikes into storage; otherwise simulate fills at candle OHLC (intrabar ambiguity remains).

## F. Recommended architecture (fully separate module)

```
new/  repo root
├── simulator/                      # new top-level module; NO imports from app/components terminal
│   ├── types.ts                   # SimSymbol, SimCandle, SimTick, SimOrder, ReplayConfig
│   ├── data/
│   │   ├── source.ts              # MarketDataSource interface:
│   │   │                            fetchCandles(symbol, interval, from, to)
│   │   │                            fetchChain(date, underlying)
│   │   │                            openTickStream() → AsyncIterable<SimTick>
│   │   ├── angelRelaySource.ts    # adapter over existing services/marketData relay
│   │   └── archiver.ts            # nightly/backfill job: relay → Supabase sim tables
│   ├── storage/
│   │   └── supabase.ts            # NEW tables ONLY (sim_candles, sim_instruments,
│   │                                sim_chain_snapshots, sim_trades) + own RLS; never
│   │                                touches schema.sql business tables
│   ├── engine/
│   │   ├── replay-clock.ts        # PlaybackClock: date, tick index, speed, play/pause/
│   │   │                            step/scrub — emits {time, seq} events
│   │   ├── candle-feed.ts         # builds/bins SimCandles from 1-min series via
│   │   │                            candleAggregator.aggregateTick
│   │   ├── fill-engine.ts         # candle-time fills (OHLC) or interpolated LTP;
│   │   │                            SL/TP matched against candle H/L first
│   │   └── sim-trading-store.ts   # self-contained paper P&L store (fork TradingStore
│   │                                with injected clock + feed; separate localStorage key)
│   └── ui/
│       ├── SimulatorPage.tsx      # new route app/simulator/page.js
│       ├── controls/              # date picker, speed, play/pause/step/scrub, reset
│       └── charts/                # reuse TVChart or ChartCanvas — see seams below
├── app/simulator/page.js          # standalone route; nothing shared with /portal/terminal
└── supabase/sim-schema.sql        # additive migration only
```

**Isolation rules (do not touch the live terminal):**

1. Never modify runtime behavior in `app/portal/terminal`, `components/terminal`,
   `components/chart`, `components/chart-tv` beyond two *backward-compatible seams*:
   - `ChartCanvas`/`TVChart`: add an optional `dataSource` prop (default = existing
     `marketData.history` call). Used only by the simulator.
   - `PriceBus`/`TradingStore`: untouched — the sim must supply its own feed adapter
     via the same `PriceBus.set` contract, and its own `sim-trading-store.ts` (no
     shared mutable state, no shared localStorage keys).
2. New Supabase tables only (`sim_*`), new RLS; the business schema is never altered.
3. The simulator's data source defaults to the archive (Supabase); the Angel relay
   adapter is used only for backfill/archive (optionally: "today live" mode).
4. `scripts/phase7-stress.mjs` pattern reused for the replay engine (immutable
   state, invariant checks after every op).

**Key decision still open:** pick ONE chart stack for the simulator — the custom
canvas engine (`components/chart`, imperatively fed via `engine.setCandles`) or the
lightweight-charts wrapper (`components/chart-tv`, fed via `TVChart.setCandles` /
`updateCandle`). Both are viable because both expose imperative candle APIs.

---

*End of audit. No code was modified.*