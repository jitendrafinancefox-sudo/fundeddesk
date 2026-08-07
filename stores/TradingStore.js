'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { PriceBus } from './PriceBus';
import { marketData } from '@/services/marketData';
import { sma, ema, rsi, macd, vwap } from '@/components/chart/engine/IndicatorCalculations';

// Professional trading engine (paper): account, margins, positions, orders,
// closed trades, alerts and notifications. External store with per-topic
// subscriptions — a price tick or order event only re-renders the widgets
// subscribed to the affected topic (requirement #9). All market orders fill
// at the live LTP; SL/TP brackets are monitored on every price tick.

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 35, FINNIFTY: 40, MIDCPNIFTY: 75, SENSEX: 20 };
const MARGIN_RATES = { option: 0.25, stock: 0.20, future: 0.12, index: 0 };
const MIN_MARGIN = 2500;
const INITIAL_CASH = 200000;
const STORAGE_KEY = 'fundeddesk:trading-v1';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
let seq = 1;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function lotSizeFor(underlying) {
  const base = String(underlying || '').toUpperCase();
  for (const key of Object.keys(LOT_SIZES)) if (base.includes(key)) return LOT_SIZES[key];
  return 50;
}

export function marginFor({ qty, price, kind }) {
  const rate = MARGIN_RATES[kind || 'option'] || MARGIN_RATES.option;
  return Math.max(Math.round(qty * price * rate), MIN_MARGIN);
}

function emptyState() {
  return {
    account: {
      cash: INITIAL_CASH,
      realized: 0,
      unrealized: 0,
      usedMargin: 0,
      available: INITIAL_CASH,
      free: INITIAL_CASH,
      equity: INITIAL_CASH,
      dailyPnl: 0,
      dailyStart: 0,
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

function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state = emptyState();
    if (parsed.cash != null) state.account.cash = parsed.cash;
    if (parsed.realized != null) state.account.realized = parsed.realized;
    if (parsed.dailyStart != null) state.account.dailyStart = parsed.dailyStart;
    state.account.dayLabel = parsed.dayLabel || today();
    state.positions = Array.isArray(parsed.positions) ? parsed.positions : [];
    state.orders = Array.isArray(parsed.orders) ? parsed.orders : [];
    state.trades = Array.isArray(parsed.trades) ? parsed.trades : [];
    state.alerts = Array.isArray(parsed.alerts) ? parsed.alerts : [];
    // New trading day -> daily P&L restarts from current realized.
    if (state.account.dayLabel !== today()) {
      state.account.dayLabel = today();
      state.account.dailyStart = state.account.realized;
    }
    return state;
  } catch { return null; }
}

const state = loadState() || emptyState();
const listeners = { account: new Set(), positions: new Set(), orders: new Set(), trades: new Set(), alerts: new Set(), notifications: new Set() };
let persistTimer = null;

function persist() {
  if (typeof window === 'undefined') return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cash: state.account.cash,
        realized: state.account.realized,
        dailyStart: state.account.dailyStart,
        dayLabel: state.account.dayLabel,
        positions: state.positions,
        orders: state.orders,
        trades: state.trades,
        alerts: state.alerts,
      }));
    } catch {}
  }, 400);
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
  state.orders = state.orders.map((o) => (o.status === 'executed' && o.positionId === position.id ? { ...o, status: 'completed', filledAt: o.filledAt } : o));
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
  getServerSnapshot(topic) { return emptyState()[topic]; },
  get() { return state; },

  lotSizeFor,

  placeOrder({ exchange, token, symbol, underlying, kind, side, lots, signalPrice, sl, tp }) {
    token = String(token);
    if (kind === 'index') { pushNotification('Index cannot be traded directly', 'error'); return null; }
    const qty = (Number(lots) || 1) * lotSizeFor(underlying);
    const price = PriceBus.get(token)?.ltp || signalPrice;
    if (!price || price <= 0) { pushNotification('No live price — order rejected', 'error'); return null; }
    const margin = marginFor({ qty, price, kind });
    const order = {
      id: uid('ord'),
      status: 'pending',
      exchange, token, symbol, underlying, kind,
      side, lots, qty, signalPrice: price, sl: sl || null, tp: tp || null,
      margin, createdAt: Date.now(), time: now(),
    };
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
    pushNotification(`${side} ${symbol} · ${lots} lot${lots > 1 ? 's' : ''} @ ${price.toFixed(2)}`, 'ok');
    setTimeout(() => fillOrder(order.id), 700);
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

  modifyOrder(id, { qty }) {
    const order = state.orders.find((o) => o.id === id);
    if (!order || order.status !== 'pending') return;
    const newQty = Math.max(1, Number(qty) || order.qty);
    const newMargin = marginFor({ qty: newQty, price: order.signalPrice, kind: order.kind });
    if (newMargin > state.account.available + order.margin) { pushNotification('Modify rejected — insufficient margin', 'error'); return; }
    state.orders = state.orders.map((o) => (o.id === id ? { ...o, qty: newQty, margin: newMargin, time: now() } : o));
    emit('orders');
    recomputeAccount();
  },

  cloneOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    this.placeOrder({
      exchange: order.exchange, token: order.token, symbol: order.symbol,
      underlying: order.underlying, kind: order.kind, side: order.side,
      lots: order.lots, signalPrice: order.signalPrice, sl: order.sl, tp: order.tp,
    });
  },

  closePosition(id, priceOverride) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const exit = priceOverride ?? p.currentPrice ?? p.avgPrice;
    settlePosition(p, exit, 'MARKET');
    pushNotification(`${p.side} ${p.symbol} closed @ ${exit.toFixed(2)}`, 'info');
  },

  reversePosition(id) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const exit = p.currentPrice ?? p.avgPrice;
    const newMargin = marginFor({ qty: p.qty, price: exit, kind: p.kind });
    if (newMargin > state.account.available) { pushNotification('Reverse rejected — insufficient margin', 'error'); return; }
    settlePosition(p, exit, 'REVERSE');
    const side = p.side === 'BUY' ? 'SELL' : 'BUY';
    const pos = {
      id: uid('pos'),
      exchange: p.exchange, token: p.token, symbol: p.symbol, underlying: p.underlying, kind: p.kind,
      side, lots: p.lots, qty: p.qty, avgPrice: exit, currentPrice: exit,
      sl: p.sl, tp: p.tp, margin: newMargin, openedAt: Date.now(), opened: now(),
    };
    state.positions = [pos, ...state.positions];
    emit('positions');
    recomputeAccount();
    pushNotification(`${side} ${p.symbol} reversed`, 'info');
  },

  addQty(id, extraLots) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const extra = (Number(extraLots) || 1) * lotSizeFor(p.underlying);
    const price = p.currentPrice ?? p.avgPrice;
    const addMargin = marginFor({ qty: extra, price, kind: p.kind });
    if (addMargin > state.account.available) { pushNotification('Add Qty rejected — insufficient margin', 'error'); return; }
    const total = p.qty + extra;
    const avg = (p.avgPrice * p.qty + price * extra) / total;
    state.positions = state.positions.map((pos) => (pos.id === id ? {
      ...pos, qty: total, lots: Math.round(total / lotSizeFor(p.underlying)),
      avgPrice: avg, margin: pos.margin + addMargin,
    } : pos));
    emit('positions');
    recomputeAccount();
    pushNotification(`Added ${extra} qty to ${p.symbol}`, 'info');
  },

  partialExit(id, exitLots) {
    const p = state.positions.find((pos) => pos.id === id);
    if (!p) return;
    const exitQty = Math.min(Math.max((Number(exitLots) || 1) * lotSizeFor(p.underlying), 1), p.qty);
    const exit = p.currentPrice ?? p.avgPrice;
    const dir = p.side === 'BUY' ? 1 : -1;
    const pnl = Math.round((exit - p.avgPrice) * dir * exitQty * 100) / 100;
    state.account.realized = Math.round((state.account.realized + pnl) * 100) / 100;
    state.account.cash = Math.round((state.account.cash + pnl) * 100) / 100;
    state.trades = [{
      id: uid('trd'), symbol: p.symbol, token: p.token, underlying: p.underlying, side: p.side,
      qty: exitQty, lots: exitQty / lotSizeFor(p.underlying),
      entry: p.avgPrice, exit, pnl,
      pnlPct: p.avgPrice ? (pnl / (p.avgPrice * exitQty)) * 100 : 0,
      ts: Date.now(), time: now(), reason: 'PARTIAL',
    }, ...state.trades];
    if (exitQty >= p.qty) {
      settlePosition(p, exit, 'PARTIAL');
    } else {
      state.positions = state.positions.map((pos) => (pos.id === id ? { ...pos, qty: p.qty - exitQty } : pos));
      emit('positions');
      emit('trades');
      recomputeAccount();
      persist();
    }
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

function fillOrder(id) {
  const order = state.orders.find((o) => o.id === id);
  if (!order || order.status !== 'pending') return;
  const ltp = PriceBus.get(order.token)?.ltp || order.signalPrice;
  state.orders = state.orders.map((o) => (o.id === id ? { ...o, status: 'executed', fillPrice: ltp, filledAt: Date.now(), filled: now() } : o));
  const pos = {
    id: uid('pos'),
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