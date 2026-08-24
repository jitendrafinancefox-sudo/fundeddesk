# ANGEL_DATA_CAPABILITY_AUDIT.md

**Purpose:** Determine whether Angel One SmartAPI can supply historical data for a
standalone NIFTY/BANKNIFTY OPTIONS market simulator.
**Mode:** Read-only investigation. No files in fundeddesk were modified, no app code
created, no live Angel session/keys used. All claims are sourced (GitHub SDK,
official forum/admin statements, live scrip master) — gaps are marked
**NOT CONFIRMED**.

**Setting convention:** "Confirmed" = stated by Angel One employees in official docs,
official GitHub SDK (`angel-one/smartapi-python`), the official SmartAPI blog, or
observed directly against a live Angel endpoint/file. Everything else = **NOT CONFIRMED**.

---

## 1. Does Angel One SmartAPI provide historical candle data?

**YES — Confirmed.**

`POST https://apiconnect.angelone.in/rest/secure/angelbroking/historical/v1/getCandleData`
(canonical SDK key `api.candle.data` in `SmartApi/smartConnect.py`). Request body:

```
{ "exchange": "NSE|NFO|BSE|BFO|CDS|MCX", "symboltoken": "3045",
  "interval": "ONE_MINUTE", "fromdate": "2024-01-01 09:00", "todate": "2024-01-03 03:30" }
```

Official blog: "Angel Broking's SmartAPI provides you **FREE OF COST Historical Data**
for all the stocks and Instruments in all the segments."

Related endpoint: `POST /historical/v1/getOIData` — **historical Open Interest** data
(confirmed by admin, Nov 2024: "for previous OI data, use Get Historical OI data API";
works for live F&O tokens; blank when no trades occurred in the window).

## 2. What intervals are available?

**Confirmed** (SDK/blog + official docs table as quoted by Angel staff):

| Interval value | Max days per request (date span) |
|---|---|
| `ONE_MINUTE` | 30 |
| `THREE_MINUTE` | 90 |
| `FIVE_MINUTE` | 90 |
| `TEN_MINUTE` | 90 |
| `FIFTEEN_MINUTE` | 180 |
| `THIRTY_MINUTE` | 180 |
| `ONE_HOUR` | 365 |
| `ONE_DAY` | 2000 |

Community reports of a ~2000-row cap per response for 1-minute calls exist; the
official table above is in *days*. Backfill must chunk requests to these windows
regardless.

## 3. Does the historical API support FROM and TO timestamps?

**YES — Confirmed.** Mandatory params `fromdate = "YYYY-MM-DD HH:MM"` and
`todate = "YYYY-MM-DD HH:MM"` (24 h IST; official SDK examples, e.g.
`"2021-02-08 09:00"` → `"2021-02-08 09:16"`). Error `AB13000` = invalid date/time
format (community-confirmed working format: `"2025-01-01 09:25"`).

## 4. Can historical data be requested for NIFTY and BANKNIFTY?

**YES — Confirmed.**

- Requests with `exchange: "NSE"` and index symbol tokens:
  - NIFTY 50 index token = **99926000** (admin-confirmed)
  - BANKNIFTY index token = **99926009**
- Observed against the live scrip master (18 Aug 2026): NSE rows `{"token":"26000","symbol":"NIFTY"}` and `{"token":"26009","symbol":"BANKNIFTY"}` — the `999…`/`…` prefix forms identify the same indices.
- Historical intraday + daily index candles are included in the free coverage
  announcement (release note "Free Historical Data Access for Indices…NFO…", Oct 2023).
- **Historical OI for indices/futures** via `getOIData` is community-reported working for live tokens.

## 5. Can historical data be requested for NIFTY/BANKNIFTY OPTIONS?

**YES for CURRENTLY LISTED contracts — Confirmed.** Admin (Jan 2024): *"For past six
month of data for Banknifty option can be accessed via Historical Data API."*
Official forum answer (Dec 2022): *"Option token can be fetched from
OpenAPIScripMaster.json to pass the same on historical API to retrieve the data."*

Practical meaning: every contract still **present in today's scrip master** has a
history window (community/admin-observed ≈ 6 months for index options). Every
contract that already **expired is unreachable** — see §7.

## 6. How are option contracts identified?

**Confirmed (master file fields, live-verified 18 Aug 2026).**

```
{ "token": "37810", "symbol": "NIFTY29DEC2623000PE", "name": "NIFTY",
  "expiry": "29DEC2026", "strike": "2300000.000000", "lotsize": "65",
  "instrumenttype": "OPTIDX", "exch_seg": "NFO", "tick_size": "5.000000" }
```

| Concept | Field | Encoding |
|---|---|---|
| **symbol** | `symbol` | `NAME ddMMMYY strike CE/PE` → `NIFTY29DEC2623000PE` (strike in **paise**, no decimal) |
| **token** | `token` | 5–9 digit string, the only accepted ID for history/WS/orders |
| **expiry** | `expiry` | `ddMMMYYYY`, e.g. `29DEC2026` |
| **strike** | `strike` | **Paise** (`2300000.000000` = ₹23,000.00); convert by ÷100 |
| **CE/PE** | `symbol` suffix | last two chars (`CE`/`PE`); `instrumenttype` `OPTIDX` (index options) / `OPTFUT` etc. |
| **lot size** | `lotsize` | **Do not hardcode** — live master shows NIFTY=65, BANKNIFTY=30 today (fundeddesk's 25/35 constants are already stale) |
| exchange for API | `exch_seg` | `NFO` for index options |

Sources of tokens: (a) **scrip master JSON** — live-verified, ~155 000 rows,
35 449 NFO rows, 5 354 current NFO index-options: `https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json` (same public file available at `margincalculator.angelbroking.com`); (b) `POST /rest/secure/angelbroking/order/v1/searchScrip` with `{"exchange":"NFO","searchscrip":"NIFTY29DEC2623000PE"}` (rate cap 1/s).

## 7. Can we retrieve historical data for EXPIRED option contracts?

**NO — Confirmed by Angel One staff, repeatedly.**

- (2022) *"Currently we are not providing any data via smartAPI for the expired contracts."*
- (Oct 2023) *"We do not provide historical data of expired F&O contracts as of now."*
- (2026-03) *"API does not currently support historical data for expired NFO options contracts."*
- Root cause (admin, 2026): **tokens are recycled** — *"Master Scrip updates everyday,
  refreshing tokens for older expiries to new ones… post its expiry token 123456 is
  allotted to its next expiry. Hence you are unable to retrieve historical data for
  older expiries."*
- Community edge-case note (NOT official policy): data for a live contract is only
  guaranteed "on the day of expiry **before 12 pm** of that day".

**Implication:** there is no way to reconstruct past option expiries that are no
longer in the master. Any year-old series must come from data **we recorded while
it was live**.

## 8. Is there an instrument master containing historical/expired option contracts?

**NO.** `OpenAPIScripMaster.json` contains **only currently active instruments**
(confirmed by multiple admin statements; also verified structurally today — all 5 354
NFO index options have unexpired future expiries). `searchScrip` also only returns
live contracts. No historical master exists publicly.

## 9. Does Angel One provide historical tick-by-tick data?

**NO endpoint exists in the documented API surface — and all staff statements point
to "not stored".** No tick-history API appears in `smartConnect.py`'s endpoint map;
there is no download API for trade-level ticks. Staff: *"data of expired contracts is
not stored"* and the only history product is OHLCV candles (`getCandleData`) + OI
(`getOIData`). An explicit "we sell/return ticks historically" statement was not
found → the categorical "no" is **strong inference from official evidence**, not a
verbatim quote: mark **NOT CONFIRMED as an absolute policy**, but plan as if it is
not available.

## 10. Does Angel One WebSocket provide live tick/LTP updates?

**YES — Confirmed.**

- `SmartWebSocketV2` → `wss://smartapisocket.angelone.in/smart-stream`
- Auth: `AUTH_TOKEN` (JWT) + `API_KEY` + `CLIENT_CODE` + `FEED_TOKEN`, heartbeat
  `"ping"` every 10 s, binary little-endian frames parsed by SDK `_parse_binary_data`.
- Subscription modes: **1 = LTP · 2 = QUOTE · 3 = SNAP_QUOTE · 4 = DEPTH** (depth = NSE
  cash only, 50-token quota per subscribe call).
- Exchange types: NSE_CM=1, NSE_FO=2 (options), BSE_CM=3, BSE_FO=4, MCX_FO=5, NCX_FO=7, CDE_FO=13.
- Limits (official beta note): **3 concurrent WebSocket connections per client code,
  max 1000 token subscriptions per session** (each token×mode counts as one).
- Every event carries `sequence_number` + `exchange_timestamp` → **recordable,
  replayable, orderable**.

## 11. Exact fields in WebSocket market data

**Confirmed from official SDK + live community tick dumps** (values in **paise/100×**,
as observed in real feeds):

| Field (all modes) | Mode 1 LTP | Mode 2 QUOTE | Mode 3 SNAP | Meaning |
|---|---|---|---|---|
| `subscription_mode` / `subscription_mode_val` | ✓ | ✓ | ✓ | 1/2/3 |
| `exchange_type` | ✓ | ✓ | ✓ | 1..13 |
| `token` | ✓ | ✓ | ✓ | string token |
| `sequence_number` | ✓ | ✓ | ✓ | exchange seq (replay ordering key) |
| `exchange_timestamp` | ✓ | ✓ | ✓ | epoch ms of the update |
| `last_traded_price` | ✓ | ✓ | ✓ | LTP (paise) |
| `last_traded_quantity` | — | ✓ | ✓ | last trade qty |
| `average_traded_price` | — | ✓ | ✓ | day VWAP |
| `volume_trade_for_the_day` | — | ✓ | ✓ | day volume |
| `total_buy_quantity` / `total_sell_quantity` | — | ✓ | ✓ | day totals |
| `open_price_of_the_day`, `high_price_of_the_day`, `low_price_of_the_day`, `closed_price` | — | ✓ | ✓ | day OHLC |
| `last_traded_timestamp` | — | — | ✓ | trade time |
| `open_interest` | — | — | ✓ | day OI (units observed as contracts; official unit NOT CONFIRMED) |
| `open_interest_change_percentage` | — | — | ✓ | (values observed as garbage in community dumps — treat as unreliable) |
| `upper_circuit_limit` / `lower_circuit_limit` | — | — | ✓ | |
| `52_week_high_price` / `52_week_low_price` | — | — | ✓ | |
| `best_5_buy_data` / `best_5_sell_data` | — | — | ✓ | `[{flag, quantity, price, "no of orders"}]` × 5 |
| (Mode 4 DEPTH) `depth_20_buy/sell_data` | — | — | — | 20-level depth, NSE_CM only |

Caution: community dumps show `open_interest_change_percentage` arriving corrupted —
do not depend on it.

## 12. Can WebSocket data be recorded and stored for future simulation?

**YES — Confirmed feasible.** The feed is a continuous, sequence-numbered stream:
any language/process can subscribe (3 connections × 1000 subscriptions) and persist
each parsed tick (token, ts, seq, LTP, OI, best-5) to storage. No statement
prohibits recording. Caveats:
- Connection is **live-only** — you can only record from the moment you subscribe
  (no backfill of missed ticks).
- Keep subscription set small & strategic (full 5354-contract chain at SNAP_QUOTE
  would exceed the 1000-token quota — one snapshot mode on ~1000 tokens max, or
  rotate strikes during a session). This quota math is **NOT CONFIRMED per-mode** —
  the official note says 1000 per session with each token×mode counting as one.
- Heartbeat/maintenance + resubscribe-on-error logic required (SDK docs).

## 13. API / WebSocket rate limits

**Confirmed (official rate-limit table, Feb 2024)**:

| Endpoint | Per second | Per minute | Per hour |
|---|---|---|---|
| `loginByPassword` | 1 | — | — |
| `generateTokens` (JWT) | 1 | — | 1000 |
| `getProfile` | 3 | — | 1000 |
| `searchScrip` | **1** | — | — |
| `getLtpData` | 10 | 500 | 5000 |
| `market/v1/quote` | 10 | 500 | 5000 |
| `historical/v1/getCandleData` | **3** | **180** | **5000** |
| `historical/v1/getOIData` | NOT CONFIRMED (inferred same family) | | |
| place/modify/cancel order | 20 | 500 | 1000 |

WebSocket limits (official beta note): **3 concurrent WS connections/client,
1000 token subscriptions/session, 50-token quota per DEPTH call**. Per-second
*message* delivery caps: **NOT CONFIRMED**.

Field-observed operational reality (2026 forum threads): users report `AB1021 "Too
many requests"` even below caps, plus `AB1004` flaky errors during backfills — the
archiver MUST implement a sliding-window limiter (3/s, 180/min, 5000/hr), exponential
backoff, and sleep-on-error.

## 14. Maximum historical date range per request

**Confirmed:** see §2 table — `ONE_MINUTE` **30 days**, `THREE_MINUTE`/`FIVE_MINUTE`/
`TEN_MINUTE` **90 days**, `FIFTEEN_MINUTE`/`THIRTY_MINUTE` **180 days**,
`ONE_HOUR` **365 days**, `ONE_DAY` **2000 days** per single call. Backfill = chunk
request windows to these bounds and stitch.

Total depth of stored history (how many years back): **NOT CONFIRMED** — no official
retention policy published for NSE/NFO candles. (Community data suggests full daily
history for equities; index F&O depth is account-dependent.)

## 15. Restrictions on historical F&O/options data

**Confirmed restrictions:**
1. **Expired contracts: not available at all** (tokens recycled, data not stored).
2. Data reachable only for tokens **present in the current master**; every expiry
   disappears from the master on rollover → the effective lookback for a specific
   option contract is from listing date to the day it leaves the master.
3. Admin-stated lookback for live BANKNIFTY options: **~6 months** (Jan 2024 statement;
   treat as approximate).
4. OI history exists (`getOIData`) but returns empty for windows with no trades;
   OI via WS `open_interest_change_percentage` is unreliable in the wild.
5. Greeks: live only, NFO only (`marketData/v1/optionGreek`); **no historical greeks** (NOT CONFIRMED as policy, but no endpoint exists).
6. `nseIntraday`/`gainersLosers` etc. are current-market tools, not history.

## 16. What we must record ourselves every trading day

Because expired options are unreachable later, a self-hosted recorder is the ONLY
way to get accurate historical option data:

| Data | Capture | Why |
|---|---|---|
| **1-min (or lower) OHLCV** for every tradable index option contract | `getCandleData` daily (after close) for all strikes/expiries (`ONE_MINUTE`, chunked 30-day windows; ~365⁺ contracts at one request each ≈ well inside rate budget) | Backbone of the simulator |
| **Index 1-min OHLCV** (99926000 / 99926009) | same daily job | Underlying context + spot-sync |
| **Tick stream (SNAP_QUOTE or QUOTE)** for index + option chain | WS recorder during market hours (≤1000 subscriptions — rotate strikes if needed) | Future tick-level fidelity |
| **OI history** | `getOIData` daily per contract | OI realism |
| **Scrip master snapshot** | daily download of `OpenAPIScripMaster.json` (public file) | Forever-preserve token↔contract mapping before rollover |
| **Chain snapshot** (IV/greeks/bid/ask) | `market/v1/quote` + `optionGreek` every few minutes | Optional realism, greeks at replay time |
| **Daily candle** per contract | part of the 1-min job | cheap insurance |

Storage estimate: per day, the full NIFTY+BANKNIFTY option surface (≈ 2,500–5,000
contracts × ~375 one-minute bars) ≈ **1–2 M rows/day** → ~5–10 MB/day raw; SQLite
with an index on `(token, ts)` handles this; scale to Parquet/columnar when expanding
to weekly expiries × months.

---

## FINAL VERDICT

### A. Can we build the simulator using Angel One data?

**Yes — partially, with a crucial constraint.** Live (still-listed) NIFTY/BANKNIFTY
option contracts give ~6 months of 1-minute OHLCV + daily candles + historical OI
for free, with full FROM/TO control. Historical **expired** contracts are simply not
available (tokens recycled, data not stored per Angel staff). A simulator scoped to
the last ~6 months of currently-reachable series is fully buildable today; a
"replay any past expiry" simulator is NOT.

### B. Can we reproduce historical NIFTY/BANKNIFTY option movement?

**Yes for the available window** — real 1-min OHLCV per contract + real index
candles + real OI = faithful reconstruction of the ~6-month window that remains in
the master. **No for older expiries** (expired-series data cannot be retrieved, ever,
by any endpoint). Realistic Greeks/IV at history time are unavailable; simulate via
Black-Scholes or record your own snapshots going forward.

### C. Can we reproduce continuously forming candles?

**Yes — Confirmed architecture-ready.** The primary clock is event-driven: replay
1-minute candle *closes* at sim time (tick = candle boundary) and the candle engine
bins them into 1m/5m/15m/1h/1D on the fly, exactly like the fundeddesk
`candleAggregator` pattern. When tick records exist, pan to pure tick streaming.
Candle continuity across 09:15–15:30 IST boundaries is trivial (session-aware
bucketing).

### D. Do we need tick-level data?

**Not for the MVP.** 1-minute candles are sufficient for: SL/TP on candle H/L,
fills at open/close, realistic P&L, and multi-timeframe charts. Tick-level is only
needed for sub-minute fills, exact intrabar stop prices, and market-depth realism —
i.e., a **Phase 2 upgrade**, not a blocker.

### E. Can Angel One provide that historical tick data?

**No.** There is no historical tick endpoint; expired-data is not stored; the only
tick source is the live WebSocket. Therefore **tick history is impossible to obtain
retroactively** — you can only record it from the day you start.

### F. If not, what data should we start recording from today?

Start the daily recorder immediately (see §16):
1. **Scrip master snapshot** daily — preserves token→contract identity before rollover.
2. **1-min OHLCV for all live NIFTY/BANKNIFTY options + both indices** — nightly
   `getCandleData` backfill job (rate-limit-safe).
3. **OI history** via `getOIData` nightly.
4. **WebSocket SNAP_QUOTE/QUOTE tick recorder** during market hours (index + chain,
   staying under the 1000-subscription quota).
5. **Chain/greeks snapshots** (`quote` + `optionGreek`) every few minutes (optional).
Store in SQLite/Parquet **outside** fundeddesk. Retention: keep at least until the
~6-month master window rolls past, then decide lifecycle.

### G. Minimum data architecture for our standalone simulator

```
┌─────────────────────── ARCHIVE (write-once) ───────────────────────┐
│ SQLite (or Parquet):                                                │
│  instruments(day, token, symbol, expiry, strike, type, lot)         │  ← daily master snap
│  candles(token, interval, ts, o,h,l,c,vol)                          │  ← nightly getCandleData
│  oi_history(token, ts, oi)                                          │  ← nightly getOIData
│  ticks(token, ts, seq, ltp, oi, best5…)       [Phase 2]             │  ← WS recorder
│  chain_snapshots(date, token, greeks…)        [optional]            │  ← quote/optionGreek
└─────────────────────────────────────────────────────────────────────┘
        ▲ reads only                                   ▲ writes only (CLI)
┌───────┴──────────────────────── REASONING ─────────────────────────┴──────┐
│ MarketDataSource interface → ArchiveSource(SQLite) | AngelLiveSource(WS) │
│ ReplayClock (speed×, pause, scrub, reset) → event spool                  │
│ CandleEngine: events → OHLCV bins → chart feed (lightweight-charts)      │
│ OrderEngine: fills at next event, SL/TP on candle H/L (or ticks)         │
│ P&L / AccountEngine: margins, daily reset, lot sizes from master data    │
│ SessionStore: orders/fills/trades per session (own storage, own keys)    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Bottom line:** Angel One gives us OHLCV + OI history for ~6 months of live options
and indices, index/option identity via the daily master, and a recordable real-time
tick feed. The **MVP runs entirely on nightly candle archives with no ticks**; the
moment we start recording master+ticks+OI today, we gain permanent, ever-growing
historical fidelity that Angel itself cannot retrospectively provide.

---

**Sources (all public, no credentials used):**
- Angel One official GitHub SDK — `smartapi-python` (`smartConnect.py`, `smartWebSocketV2.py`) — endpoint map, WS fields, subscribe/quota constants
- Angel One SmartAPI official blog — *Introduction to Historical Data API* (request format, response, master download)
- SmartAPI official forum / staff replies — expired-contract availability (2022, 2023, 2026), token recycling, 6-month BANKNIFTY options window, OI endpoint, WS 2.0 beta limits (3 connections / 1000 subscriptions / depth 50), rate-limit table (Feb 2024)
- Live-verified today (18 Aug 2026): `https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json` — 155 093 rows; NIFTY/NIFTY option / BANKNIFTY option samples; index tokens 26000/26009; NFO OPTIDX count 5 354; NIFTY lot 65, BANKNIFTY lot 30
- Environment observation: fundeddesk `services/marketData.js` (relay unwraps both `{candles:[…]}` and bare-array candle envelopes) — cited only as format evidence; the relay is NOT a dependency of the new simulator

*End of audit. No files modified except this report.*