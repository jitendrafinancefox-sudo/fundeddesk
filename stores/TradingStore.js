'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { PriceBus } from './PriceBus';
import { marketData } from '@/services/marketData';
import { sma, ema, rsi, macd, vwap } from '@/components/chart/engine/IndicatorCalculations';
import { checkOrderAgainstRules, checkCloseAgainstRules, isWeekendNow } from '@/lib/simRisk';

// PRACTICE SIMULATOR — paper trading engine. Account, margins, positions,
// orders, closed trades, alerts and notifications live ONLY in this browser
// (localStorage). Nothing here is sent to a broker or exchange, and nothing
// here writes to the real trades / accounts / positions tables — it has no
// effect on the evaluation or funded account. Market orders "fill" against
// the delayed/indicative LTP after a short delay; SL/TP brackets are checked
// on every price tick.
//
// The constants below (lot sizes, margin rates, minimum margin, starting
// cash) are SIMULATOR PARAMETERS, not authoritative market data. Real lot
// sizes change over time and must come from an exchange scrip-master; do not
// use these for any real-execution or real-risk decision.

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 35, FINNIFTY: 40, MIDCPNIFTY: 75, SENSEX: 20 };
const MARGIN_RATES = { option: 0.25, stock: 0.20, future: 0.12, index: 0 };
const MIN_MARGIN = 2500;
const INITIAL_CASH = 200000;
const DEFAULT_STORAGE_KEY = 'fundeddesk:trading-v1';
// Scoped by the selected FundedDesk account when the terminal is opened from
// inside the portal (see setAccountScope) — keyed on account.login_id, never
// the raw Supabase UUID, so account A's wallet can never appear for account
// B and this key never needs to be treated as sensitive. Falls back to the
// single global key when there is no account context (e.g. /tv-chart).
let storageKey = DEFAULT_STORAGE_KEY;
let currentAccountScope = null; // the raw scope id passed to setAccountScope, or null

// Rules for the currently scoped account, as resolved by the ONE canonical
// getRulesForAccount() (lib/rules.js) and handed in via setRules() — never
// looked up or hardcoded here. null when there is no account context
// (e.g. /tv-chart), in which case every rule check below is a no-op,
// preserving that route's pre-existing unrestricted behavior exactly.
let currentRules = null;

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
let seq = 1;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// Longest key first — "BANKNIFTY" contains "NIFTY" as a substring, so
// matching in declaration order would silently return NIFTY's lot size for
// every BANKNIFTY/FINNIFTY/MIDCPNIFTY symbol. This is only ever a fallback:
// placeOrder() prefers the real lot size from the live option chain when
// one is available (see lotSize param), and addQty()/partialExit() prefer
// the position's own recorded qty/lots ratio — both take priority over this table.
const LOT_SIZE_KEYS = Object.keys(LOT_SIZES).sort((a, b) => b.length - a.length);
export function lotSizeFor(underlying) {
  const base = String(underlying || '').toUpperCase();
  for (const key of LOT_SIZE_KEYS) if (base.includes(key)) return LOT_SIZES[key];
  return 50;
}

export function marginFor({ qty, price, kind }) {
  const rate = MARGIN_RATES[kind || 'option'] || MARGIN_RATES.option;
  return Math.max(Math.round(qty * price * rate), MIN_MARGIN);
}

// `capital`, when a positive finite number, seeds the wallet from the real
// FundedDesk account's plan capital instead of the generic simulator default
// — the only place account capital enters TradingStore (see setAccountScope).
function emptyState(capital) {
  const cash = Number.isFinite(capital) && capital > 0 ? capital : INITIAL_CASH;
  return {
    account: {
      cash,
      realized: 0,
      unrealized: 0,
      usedMargin: 0,
      available: cash,
      free: cash,
      equity: cash,
      dailyPnl: 0,
      dailyStart: 0,
      // Live intraday high-water-mark, tracked only in the simulator (the
      // real ledger has no equity-snapshot history to do this — see
      // lib/riskEngine.js's NO_AUTOMATIC_DAILY_RESET gap). Resets with
      // dailyStart at the next IST-day rollover in loadState().
      dailyPeakEquity: cash,
      dayLabel: today(),
      openPositions: 0,
      openOrders: 0,
    },
    positions: [],
    orders: [],
    trades: [],
    alerts: [],
    notifications: [],
  };
}

// A position with no valid numeric entry price is corrupt persisted state
// (e.g. from an older schema), not a legitimate open position — drop it on
// load rather than letting it flow into chart/UI code as `avgPrice: undefined`.
function isValidPosition(p) {
  return p && typeof p === 'object' && Number.isFinite(Number(p.avgPrice)) && Number.isFinite(Number(p.qty));
}

function loadState(key = storageKey) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = emptyState();
    if (parsed.cash != null) state.account.cash = parsed.cash;
    if (parsed.realized != null) state.account.realized = parsed.realized;
    if (parsed.dailyStart != null) state.account.dailyStart = parsed.dailyStart;
    if (parsed.dailyPeakEquity != null) state.account.dailyPeakEquity = parsed.dailyPeakEquity;
    state.account.dayLabel = parsed.dayLabel || today();
    state.positions = (Array.isArray(parsed.positions) ? parsed.positions : []).filter(isValidPosition);
    state.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
    state.trades = Array.isArray(parsed.trades) ? parsed.trades : [];
    state.alerts = Array.isArray(parsed.alerts) ? parsed.alerts : [];
    // New trading day -> daily P&L and the intraday high-water-mark both
    // restart from today's opening state.
    if (state.account.dayLabel !== today()) {
      state.account.dayLabel = today();
      state.account.dailyStart = state.account.realized;
      state.account.dailyPeakEquity = state.account.cash;
    }
    return state;
  } catch { return null; }
}

const state = loadState() || emptyState();
const listeners = { account: new Set(), positions: new Set(), orders: new Set(), trades: new Set(), alerts: new Set(), notifications: new Set() };
const serverSnapshots = {};
for (const topic of Object.keys(listeners)) serverSnapshots[topic] = emptyState()[topic];
let persistTimer = null;

function serializeState() {
  return JSON.stringify({
    cash: state.account.cash,
    realized: state.account.realized,
    dailyStart: state.account.dailyStart,
    dailyPeakEquity: state.account.dailyPeakEquity,
    dayLabel: state.account.dayLabel,
    positions: state.positions,
    orders: state.orders,
    trades: state.trades,
    alerts: state.alerts,
  });
}

function persist() {
  if (typeof window === 'undefined') return;
  clearTimeout(persistTimer);
  const key = storageKey; // capture now — a scope switch before the timer
                           // fires must not write account A's data under B's key
  persistTimer = setTimeout(() => {
    try { localStorage.setItem(key, serializeState()); } catch {}
  }, 400);
}

// Writes the outgoing account's pending debounced state immediately, before
// switching scope — otherwise the 400ms debounce could fire AFTER storageKey
// has already moved on and silently write account A's data under account B.
function flushPersist() {
  if (typeof window === 'undefined') return;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    try { localStorage.setItem(storageKey, serializeState()); } catch {}
  }
}

// Replaces every top-level slice of `state` in place (the object itself is
// `const`) and notifies every subscriber — used only when switching account
// scope, since that's a full wallet swap, not an incremental update.
function applyState(next) {
  for (const key of Object.keys(next)) state[key] = next[key];
  state.notifications = [];
  // loadState()/emptyState() only ever set the raw ledger fields (cash,
  // positions, orders, trades) — available/free/equity/dailyPeakEquity are
  // DERIVED and must be recomputed now, or subscribers briefly see the old
  // scope's numbers (or the scaffold's INITIAL_CASH default) until the next
  // price tick happens to call recomputeAccount() on its own.
  recomputeAccount(); // emits 'account' itself when the derived figures actually changed
  for (const topic of Object.keys(listeners)) { if (topic !== 'account') emit(topic); }
}

function emit(topic) { listeners[topic].forEach((fn) => fn()); }

function pushNotification(text, kind = 'alert') {
  state.notifications = [...state.notifications.slice(-7), { id: uid('ntf'), text, kind, ts: Date.now() }];
  emit('notifications');
}

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.24);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {}
}

// ------------------------------------------------ derived account

function recomputeAccount() {
  let unrealized = 0;
  let used = 0;
  for (const p of state.positions) {
    const cur = p.currentPrice ?? p.avgPrice;
    const dir = p.side === 'BUY' ? 1 : -1;
    unrealized += (cur - p.avgPrice) * dir * p.qty;
    used += p.margin;
  }
  for (const o of state.orders) if (o.status === 'pending') used += o.margin;
  const cash = state.account.cash;
  const equity = cash + unrealized;
  const next = {
    ...state.account,
    unrealized: Math.round(unrealized * 100) / 100,
    usedMargin: used,
    available: cash - used,
    free: equity - used,
    equity,
    // Live intraday high-water-mark for the simulator's own trailing
    // daily-drawdown check (lib/simRisk.js) — never decreases within a day.
    dailyPeakEquity: Math.max(state.account.dailyPeakEquity ?? equity, equity),
    dailyPnl: Math.round(((state.account.realized - state.account.dailyStart) + unrealized) * 100) / 100,
    openPositions: state.positions.length,
    openOrders: state.orders.filter((o) => o.status === 'pending').length,
  };
  // Keep the reference stable when nothing actually changed (avoids re-render churn).
  let changed = false;
  for (const key of Object.keys(next)) { if (next[key] !== state.account[key]) { changed = true; break; } }
  if (changed) { state.account = next; emit('account'); }
}

// ------------------------------------------------ SL / TP + trade records

function recordTrade(position, exitPrice, reason) {
  const dir = position.side === 'BUY' ? 1 : -1;
  const pnl = Math.round((exitPrice - position.avgPrice) * dir * position.qty * 100) / 100;
  state.account.realized = Math.round((state.account.realized + pnl) * 100) / 100;
  state.account.cash = Math.round((state.account.cash + pnl) * 100) / 100;
  state.trades = [{
    id: uid('trd'),
    orderId: position.orderId || null,
    symbol: position.symbol,
    token: position.token,
    underlying: position.underlying,
    side: position.side,
    qty: position.qty,
    lots: position.lots,
    entry: position.avgPrice,
    exit: exitPrice,
    pnl,
    pnlPct: position.avgPrice ? (pnl / (position.avgPrice * position.qty)) * 100 : 0,
    ts: Date.now(),
    time: now(),
    reason,
  }, ...state.trades];
  emit('trades');
}

function settlePosition(position, exitPrice, reason) {
  recordTrade(position, exitPrice, reason);
  state.positions = state.positions.filter((p) => p.id !== position.id);
  state.orders = state.orders.map((o) => (o.status === 'executed' && o.id === position.orderId ? { ...o, status: 'completed', filledAt: o.filledAt } : o));
  emit('positions');
  emit('orders');
  recomputeAccount();
  persist();
}

// ------------------------------------------------ engine: live ticks

let engineStarted = false;
function startEngine() {
  if (engineStarted || typeof window === 'undefined') return;
  engineStarted = true;

  PriceBus.onAll((token, quote) => {
    if (!quote || quote.ltp == null) return;

    // 1. Position MTM + SL/TP brackets
    let touched = false;
    for (const p of state.positions) {
      if (p.token !== token) continue;
      if (p.currentPrice === quote.ltp) continue;
      p.currentPrice = quote.ltp;
      touched = true;
      if (p.side === 'BUY') {
        if (p.sl != null && quote.ltp <= p.sl) { settlePosition(p, p.sl, 'SL'); return; }
        if (p.tp != null && quote.ltp >= p.tp) { settlePosition(p, p.tp, 'TP'); return; }
      } else {
        if (p.sl != null && quote.ltp >= p.sl) { settlePosition(p, p.sl, 'SL'); return; }
        if (p.tp != null && quote.ltp <= p.tp) { settlePosition(p, p.tp, 'TP'); return; }
      }
    }
    if (touched) emit('positions');
    if (touched) recomputeAccount();

    // 1b. Pending LIMIT orders: a real broker fills a BUY limit once price
    // trades at/below the limit, and a SELL limit once price trades at/above
    // it — checked against the same live LTP ticks that drive positions.
    for (const o of state.orders) {
      if (o.status !== 'pending' || o.orderType !== 'LIMIT' || o.token !== token) continue;
      const crossed = o.side === 'BUY' ? quote.ltp <= o.limitPrice : quote.ltp >= o.limitPrice;
      if (crossed) { fillOrder(o.id, o.limitPrice); }
    }

    // 2. Price / drawing alerts for this token
    for (const a of state.alerts) {
      if (!a.armed || a.firedAt) continue;
      if (a.token !== token || (a.type !== 'price' && a.type !== 'drawing')) continue;
      const level = Number(a.level);
      if (!Number.isFinite(level)) continue;
      const hit = a.condition === 'below' ? quote.ltp < level : quote.ltp > level;
      if (hit) triggerAlert(a);
    }
  });

  // Indicator alerts: poll candle history while any indicator alert is armed.
  let indicatorTimer = null;
  const pollIndicators = async () => {
    const targets = state.alerts.filter((a) => a.type === 'indicator' && a.armed && !a.firedAt);
    if (!targets.length) return;
    for (const a of targets) {
      try {
        const signal = new AbortController();
        const candles = await marketData.history(a.exchange || 'NSE', a.token, 'FIVE_MINUTE', signal.signal);
        signal.abort();
        if (!Array.isArray(candles) || candles.length < 30) continue;
        const value = indicatorValue(a.indicator, candles);
        if (value == null) continue;
        const hit = a.condition === 'below' ? value < a.level : value > a.level;
        if (hit) triggerAlert(a);
      } catch {}
    }
  };
  indicatorTimer = setInterval(() => { pollIndicators(); }, 15000);
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => clearInterval(indicatorTimer), { once: true });
}

function indicatorValue(id, candles) {
  try {
    if (id === 'sma20') return sma(candles, 20).at(-1)?.price;
    if (id === 'sma50') return sma(candles, 50).at(-1)?.price;
    if (id === 'ema20') return ema(candles, 20).at(-1)?.price;
    if (id === 'ema50') return ema(candles, 50).at(-1)?.price;
    if (id === 'vwap') return vwap(candles).at(-1)?.price;
    if (id === 'rsi') return rsi(candles, 14).at(-1)?.price;
    if (id === 'macd') return macd(candles).line.at(-1)?.price;
  } catch {}
  return null;
}

function triggerAlert(a) {
  a.firedAt = Date.now();
  const text = `${a.label}: price ${a.condition} ${Number(a.level).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  pushNotification(text, 'alert');
  if (a.channel?.sound) playAlertSound();
  emit('alerts');
}

// ------------------------------------------------ actions

export const TradingStore = {
  subscribe(topic, fn) {
    if (!listeners[topic]) return () => {};
    startEngine();
    listeners[topic].add(fn);
    return () => listeners[topic].delete(fn);
  },
  getSnapshot(topic) { return state[topic]; },
  getServerSnapshot(topic) { return serverSnapshots[topic]; },
  get() { return state; },

  lotSizeFor,

  // Scopes the simulator wallet to a FundedDesk account. `scopeId` should be
  // a stable, non-sensitive identifier (e.g. account.login_id) — never a raw
  // Supabase UUID. Pass null/undefined to fall back to the single global
  // wallet (the pre-account-aware behavior, still used on /tv-chart which
  // has no account context at all).
  //
  // A no-op when already on this scope, so callers can safely call it from
  // a render-driven effect on every account-context change without
  // resetting an in-progress session. `capital`, when known, seeds a BRAND
  // NEW wallet for this account (never overwrites an existing persisted one).
  setAccountScope(scopeId, capital) {
    const key = scopeId ? `fundeddesk:trading-v1:acct:${scopeId}` : DEFAULT_STORAGE_KEY;
    if (key === storageKey && scopeId === currentAccountScope) return;
    flushPersist();
    storageKey = key;
    currentAccountScope = scopeId || null;
    applyState(loadState(key) || emptyState(capital));
  },
  getAccountScope() { return currentAccountScope; },

  // Rules for the CURRENTLY scoped account, as already resolved by
  // getRulesForAccount() — this store only ever reads them, never resolves
  // or hardcodes rule values itself. Pass null to clear (no account context).
  setRules(rules) { currentRules = rules || null; },
  getRules() { return currentRules; },

  notify(text, kind) { pushNotification(text, kind); },

  // orderType: 'MARKET' (default) or 'LIMIT' — these are the only two the
  // simulator engine actually implements (see startEngine's tick loop for
  // the LIMIT crossing check). lotSize, when provided, is the real exchange
  // lot size for this instrument (e.g. from the live option chain) and
  // takes priority over the simulator's own fallback table.
  placeOrder({ exchange, token, symbol, underlying, kind, side, lots, signalPrice, sl, tp, orderType, limitPrice, lotSize }) {
    token = String(token);
    if (kind === 'index') { pushNotification('Index cannot be traded directly', 'error'); return null; }
    const type = orderType === 'LIMIT' ? 'LIMIT' : 'MARKET';
    const size = Number(lotSize) > 0 ? Number(lotSize) : lotSizeFor(underlying);
    const qty = (Number(lots) || 1) * size;
    const livePrice = PriceBus.get(token)?.ltp || signalPrice;
    if (type === 'LIMIT') {
      const limit = Number(limitPrice);
      if (!Number.isFinite(limit) || limit <= 0) { pushNotification('Invalid limit price — order rejected', 'error'); return null; }
    } else if (!livePrice || livePrice <= 0) {
      pushNotification('No live price — order rejected', 'error'); return null;
    }
    const refPrice = type === 'LIMIT' ? Number(limitPrice) : livePrice;
    const margin = marginFor({ qty, price: refPrice, kind });
    const order = {
      id: uid('ord'),
      status: 'pending',
      exchange, token, symbol, underlying, kind,
      side, lots, qty, orderType: type, limitPrice: type === 'LIMIT' ? Number(limitPrice) : null,
      signalPrice: type === 'LIMIT' ? (livePrice || null) : livePrice,
      sl: sl || null, tp: tp || null,
      margin, createdAt: Date.now(), time: now(),
    };
    // Account rule check (only when an account context has resolved rules
    // via setRules — /tv-chart has none and stays unrestricted). Rejected
    // the same way an insufficient-margin order already is: a real
    // 'rejected' order record with the actual reason, not a silent no-op.
    const ruleCheck = checkOrderAgainstRules({
      rules: currentRules, positions: state.positions, trades: state.trades,
      account: state.account,
      // cash only ever moves by +=pnl (recordTrade), and realized is that
      // same running sum, so cash - realized is invariant == the original
      // seeded capital — the one value this module never separately stores.
      capital: state.account.cash - state.account.realized,
      side, underlying, sl,
    });
    if (!ruleCheck.ok) {
      state.orders = [{ ...order, id: uid('ord'), status: 'rejected', time: now(), rejectReason: ruleCheck.reason }, ...state.orders];
      emit('orders');
      recomputeAccount();
      pushNotification(`${side} ${symbol} rejected — ${ruleCheck.reason}`, 'error');
      return null;
    }
    if (margin > state.account.available) {
      state.orders = [{
        ...order,
        id: uid('ord'),
        status: 'rejected',
        time: now(),
        rejectReason: `Insufficient margin (need ${fmtINR(margin)})`,
      }, ...state.orders];
      emit('orders');
      recomputeAccount();
      pushNotification(`${side} ${symbol} rejected — insufficient margin`, 'error');
      return null;
    }
    state.orders = [order, ...state.orders];
    emit('orders');
    recomputeAccount();
    if (type === 'LIMIT') {
      pushNotification(`${side} ${symbol} · ${lots} lot${lots > 1 ? 's' : ''} LIMIT @ ${refPrice.toFixed(2)}`, 'ok');
      // A limit that already sits at/through the live price fills like a
      // real broker would on receipt — otherwise it waits for the next
      // matching tick (see startEngine).
      const crossedNow = livePrice > 0 && (side === 'BUY' ? livePrice <= refPrice : livePrice >= refPrice);
      if (crossedNow) setTimeout(() => fillOrder(order.id, refPrice), 700);
    } else {
      pushNotification(`${side} ${symbol} · ${lots} lot${lots > 1 ? 's' : ''} @ ${refPrice.toFixed(2)}`, 'ok');
      setTimeout(() => fillOrder(order.id), 700);
    }
    return order;
  },

  cancelOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order || order.status !== 'pending') return;
    state.orders = state.orders.map((o) => (o.id === id ? { ...o, status: 'cancelled', time: now() } : o));
    emit('orders');
    recomputeAccount();
    pushNotification(`${order.symbol} order cancelled`, 'info');
  },

  modifyOrder(id, { qty, limitPrice }) {
    const order = state.orders.find((o) => o.id === id);
    if (!order || order.status !== 'pending') return;
    const newQty = Math.max(1, Number(qty) || order.qty);
    const newLimit = order.orderType === 'LIMIT'
      ? (Number.isFinite(Number(limitPrice)) && Number(limitPrice) > 0 ? Number(limitPrice) : order.limitPrice)
      : order.limitPrice;
    const refPrice = order.orderType === 'LIMIT' ? newLimit : order.signalPrice;
    const newMargin = marginFor({ qty: newQty, price: refPrice, kind: order.kind });
    if (newMargin > state.account.available + order.margin) { pushNotification('Modify rejected — insufficient margin', 'error'); return; }
    state.orders = state.orders.map((o) => (o.id === id ? { ...o, qty: newQty, limitPrice: newLimit, margin: newMargin, time: now() } : o));
    emit('orders');
    recomputeAccount();
  },

  cloneOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    this.placeOrder({
      exchange: order.exchange, token: order.token, symbol: order.symbol,
      underlying: order.underlying, kind: order.kind, side: order.side,
      lots: order.lots, lotSize: order.lots ? order.qty / order.lots : undefined,
      signalPrice: order.signalPrice, sl: order.sl, tp: order.tp,
      orderType: order.orderType, limitPrice: order.limitPrice,
    });
  },

  closePosition(id, priceOverride) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const guard = checkCloseAgainstRules({ rules: currentRules, position: p });
    if (!guard.ok) { pushNotification(`Close rejected — ${guard.reason}`, 'error'); return; }
    const exit = priceOverride ?? p.currentPrice ?? p.avgPrice;
    settlePosition(p, exit, 'MARKET');
    pushNotification(`${p.side} ${p.symbol} closed @ ${exit.toFixed(2)}`, 'info');
  },

  reversePosition(id) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const guard = checkCloseAgainstRules({ rules: currentRules, position: p });
    if (!guard.ok) { pushNotification(`Reverse rejected — ${guard.reason}`, 'error'); return; }
    const side = p.side === 'BUY' ? 'SELL' : 'BUY';
    // Reverse doesn't just close p — it immediately opens a brand-new
    // position on the opposite side, which is genuinely new market exposure
    // and must clear the same gates a fresh order would (previously this
    // only checked minimum-trade-duration on the closing leg, so a reverse
    // could silently open a position on a blocked weekend or past the
    // stacking limit). Checked BEFORE anything is mutated, so a rejection
    // leaves the original position untouched.
    const orderCheck = checkOrderAgainstRules({
      rules: currentRules,
      positions: state.positions.filter((x) => x.id !== p.id),
      trades: state.trades, account: state.account,
      capital: state.account.cash - state.account.realized,
      side, underlying: p.underlying, sl: p.sl,
    });
    if (!orderCheck.ok) { pushNotification(`Reverse rejected — ${orderCheck.reason}`, 'error'); return; }
    const exit = p.currentPrice ?? p.avgPrice;
    const newMargin = marginFor({ qty: p.qty, price: exit, kind: p.kind });
    if (newMargin > state.account.available) { pushNotification('Reverse rejected — insufficient margin', 'error'); return; }
    settlePosition(p, exit, 'REVERSE');
    const pos = {
      id: uid('pos'),
      exchange: p.exchange, token: p.token, symbol: p.symbol, underlying: p.underlying, kind: p.kind,
      side, lots: p.lots, qty: p.qty, avgPrice: exit, currentPrice: exit,
      // The old SL/TP were calibrated for the OLD direction — carrying them
      // over as raw numbers is actively wrong, not just stale: e.g. a BUY's
      // SL sits BELOW entry, so on a SELL it reads as "price already at/through
      // stop" and fires the very next tick, instantly closing the position
      // that was just opened. Start flat; the risk-managed intent of the
      // original position was already verified above (checkOrderAgainstRules
      // sees the old sl), the user sets a fresh, correctly-directioned
      // SL/TP via the existing Modify action.
      sl: null, tp: null, margin: newMargin, openedAt: Date.now(), opened: now(),
    };
    state.positions = [pos, ...state.positions];
    emit('positions');
    recomputeAccount();
    pushNotification(`${side} ${p.symbol} reversed — set a new SL/TP for this position`, 'info');
  },

  addQty(id, extraLots) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    // Growing an existing position adds new market exposure just like a
    // fresh order does, so the same weekend gate applies. Stacking/SL-
    // required are intentionally NOT re-checked here: this merges into the
    // position's existing row rather than creating a new one (see
    // reversePosition's own comment on this simulator's separate-positions
    // model), and the position already carries whatever SL it was opened
    // with.
    if (currentRules?.weekendTrading === false && isWeekendNow()) {
      pushNotification('Add Qty rejected — weekend trading is not permitted for this account.', 'error');
      return;
    }
    // The position's own qty/lots ratio is the REAL lot size it was opened
    // with (e.g. from the live option chain) — prefer that over the generic
    // fallback table, which can disagree with the exchange's actual lot size.
    const perLot = p.lots ? p.qty / p.lots : lotSizeFor(p.underlying);
    const extra = (Number(extraLots) || 1) * perLot;
    const price = p.currentPrice ?? p.avgPrice;
    const addMargin = marginFor({ qty: extra, price, kind: p.kind });
    if (addMargin > state.account.available) { pushNotification('Add Qty rejected — insufficient margin', 'error'); return; }
    const total = p.qty + extra;
    const avg = (p.avgPrice * p.qty + price * extra) / total;
    state.positions = state.positions.map((pos) => (pos.id === id ? {
      ...pos, qty: total, lots: Math.round(total / perLot),
      avgPrice: avg, margin: pos.margin + addMargin,
    } : pos));
    emit('positions');
    recomputeAccount();
    pushNotification(`Added ${extra} qty to ${p.symbol}`, 'info');
  },

  partialExit(id, exitLots) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const guard = checkCloseAgainstRules({ rules: currentRules, position: p });
    if (!guard.ok) { pushNotification(`Partial exit rejected — ${guard.reason}`, 'error'); return; }
    // Same real-lot-size preference as addQty (see its comment).
    const perLot = p.lots ? p.qty / p.lots : lotSizeFor(p.underlying);
    const exitQty = Math.min(Math.max((Number(exitLots) || 1) * perLot, 1), p.qty);
    const exit = p.currentPrice ?? p.avgPrice;
    if (exitQty >= p.qty) {
      // Exiting the entire remaining quantity IS a full close — let
      // settlePosition()/recordTrade() own the P&L + trade-record + order
      // 'completed' transition exactly once. (Previously this branch ALSO
      // recorded its own trade + realized P&L above, then settlePosition did
      // it again — a real double-count / duplicate trade-history bug.)
      settlePosition(p, exit, 'PARTIAL');
      pushNotification(`Partial exit ${exitQty} qty on ${p.symbol}`, 'info');
      return;
    }
    const dir = p.side === 'BUY' ? 1 : -1;
    const pnl = Math.round((exit - p.avgPrice) * dir * exitQty * 100) / 100;
    state.account.realized = Math.round((state.account.realized + pnl) * 100) / 100;
    state.account.cash = Math.round((state.account.cash + pnl) * 100) / 100;
    state.trades = [{
      id: uid('trd'), orderId: p.orderId || null, symbol: p.symbol, token: p.token, underlying: p.underlying, side: p.side,
      qty: exitQty, lots: exitQty / perLot,
      entry: p.avgPrice, exit, pnl,
      pnlPct: p.avgPrice ? (pnl / (p.avgPrice * exitQty)) * 100 : 0,
      ts: Date.now(), time: now(), reason: 'PARTIAL',
    }, ...state.trades];
    // Remaining quantity keeps the same average entry (a partial exit never
    // changes avgPrice) but must release its proportional share of margin —
    // otherwise usedMargin/available stay overstated for the smaller position.
    const remainingQty = p.qty - exitQty;
    state.positions = state.positions.map((pos) => (pos.id === id
      ? { ...pos, qty: remainingQty, lots: remainingQty / perLot, margin: Math.round(pos.margin * remainingQty / p.qty) }
      : pos));
    emit('positions');
    emit('trades');
    recomputeAccount();
    persist();
    pushNotification(`Partial exit ${exitQty} qty on ${p.symbol}`, 'info');
  },

  modifyPosition(id, { sl, tp }) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    state.positions = state.positions.map((pos) => (pos.id === id ? {
      ...pos,
      sl: sl == null || sl === '' ? null : Number(sl),
      tp: tp == null || tp === '' ? null : Number(tp),
    } : pos));
    emit('positions');
    persist();
  },

  addAlert(alert) {
    state.alerts = [{ id: uid('alr'), armed: true, firedAt: null, channel: { popup: true, sound: true }, ...alert }, ...state.alerts];
    emit('alerts');
    persist();
  },

  removeAlert(id) {
    state.alerts = state.alerts.filter((a) => a.id !== id);
    emit('alerts');
    persist();
  },

  armAlert(id, armed) {
    state.alerts = state.alerts.map((a) => (a.id === id ? { ...a, armed, firedAt: armed ? null : a.firedAt } : a));
    emit('alerts');
    persist();
  },

  clearNotifications() { state.notifications = []; emit('notifications'); },

  dismissNotification(id) {
    const remaining = state.notifications.filter((n) => n.id !== id);
    if (remaining.length !== state.notifications.length) {
      state.notifications = remaining;
      emit('notifications');
    }
  },
};

function fillOrder(id, fillPriceOverride) {
  const order = state.orders.find((o) => o.id === id);
  if (!order || order.status !== 'pending') return;
  // MARKET orders fill at the live LTP; LIMIT orders fill at the limit price
  // that was actually crossed (the caller passes it explicitly).
  const ltp = fillPriceOverride ?? PriceBus.get(order.token)?.ltp ?? order.signalPrice;
  state.orders = state.orders.map((o) => (o.id === id ? { ...o, status: 'executed', fillPrice: ltp, filledAt: Date.now(), filled: now() } : o));
  const pos = {
    id: uid('pos'),
    orderId: order.id,
    exchange: order.exchange, token: order.token, symbol: order.symbol, underlying: order.underlying, kind: order.kind,
    side: order.side, lots: order.lots, qty: order.qty,
    avgPrice: ltp, currentPrice: ltp, sl: order.sl, tp: order.tp,
    margin: order.margin, openedAt: Date.now(), opened: now(),
  };
  state.positions = [pos, ...state.positions];
  emit('orders');
  emit('positions');
  recomputeAccount();
  persist();
  pushNotification(`Filled ${order.side} ${order.symbol} ${order.qty} qty @ ${ltp.toFixed(2)}`, 'ok');
}

export function fmtINR(value) {
  const v = Number(value) || 0;
  return (v < 0 ? '-' : '') + '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// React binding: re-renders only when the subscribed topic's slice reference
// changes (requirement #9 — affected widgets only).
export function useTradeState(topic) {
  const subscribe = useCallback((cb) => TradingStore.subscribe(topic, cb), [topic]);
  const get = useCallback(() => TradingStore.getSnapshot(topic), [topic]);
  const server = useCallback(() => TradingStore.getServerSnapshot(topic), [topic]);
  return useSyncExternalStore(subscribe, get, server);
}