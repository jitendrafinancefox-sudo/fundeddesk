'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// Live quote bus. A tiny external store (no React context) mapping token ->
// quote so that a price tick only re-renders the widgets subscribed to that
// exact token. Feeds come from the chart panes (PaneManager.updatePanePrice)
// and the chain/stock polling in TerminalDataLayer.
//
// Quote shape: { ltp, bid, ask, change, prevClose, ts }

const quotes = new Map();
const perToken = new Map(); // token -> Set<fn>
const allListeners = new Set(); // -> Set<fn> (engine watchers such as TradingStore)

function listenersFor(token) {
  let set = perToken.get(token);
  if (!set) { set = new Set(); perToken.set(token, set); }
  return set;
}

const NULL_QUOTE = Object.freeze({ ltp: null, bid: null, ask: null, change: null, prevClose: null, ts: 0 });

// A tick is considered LIVE for this long after arrival — set generously
// above both real feeds' own poll cadence (LiveQuoteFeed: 2s;
// useMarketData's option-chain poll: 1.5s) so normal poll jitter never
// flickers into STALE.
const LIVE_WINDOW_MS = 6000;

// Per-token freshness only (Phase 8, Step 7/8). This is NOT a second
// connectivity signal — relay-level up/down is already tracked by
// TVTerminal's relayStatus (StatusBar's LIVE/OFFLINE), reused rather than
// duplicated. This only answers "how old is the last tick we actually
// have for this token," using the real timestamp PriceBus.set() already
// stamps on every write — no new timing source invented.
export function quoteStatus(token, now = Date.now()) {
  const q = PriceBus.get(token);
  if (!q || q.ltp == null) return 'UNAVAILABLE';
  return now - q.ts <= LIVE_WINDOW_MS ? 'LIVE' : 'STALE';
}

export const PriceBus = {
  set(token, patch) {
    if (token == null || typeof patch !== 'object') return;
    const key = String(token);
    const prev = quotes.get(key) || NULL_QUOTE;
    const next = { ...prev, ...patch, ts: Date.now() };
    quotes.set(key, next);
    listenersFor(key).forEach((fn) => fn(next));
    allListeners.forEach((fn) => fn(key, next));
  },

  get(token) {
    return token == null ? null : quotes.get(String(token)) || null;
  },

  subscribe(token, fn) {
    const key = String(token);
    const set = listenersFor(key);
    set.add(fn);
    return () => { set.delete(fn); if (!set.size) perToken.delete(key); };
  },

  // Engine-wide watcher: called with (token, quote) for every tick.
  onAll(fn) { allListeners.add(fn); return () => allListeners.delete(fn); },

  tokens() { return [...quotes.keys()]; },
};

// React binding. Re-renders only when THIS token's quote reference changes.
export function usePrice(token) {
  const key = token == null ? null : String(token);
  const subscribe = useCallback((cb) => (key == null ? () => {} : PriceBus.subscribe(key, cb)), [key]);
  const get = useCallback(() => (key == null ? NULL_QUOTE : PriceBus.get(key) || NULL_QUOTE), [key]);
  return useSyncExternalStore(subscribe, get, () => NULL_QUOTE);
}

// React binding for quoteStatus(). A tick refreshes it immediately; a
// lightweight poll also re-evaluates every 2s so a token that simply stops
// receiving ticks (no new tick event to react to) still flips LIVE -> STALE
// on its own instead of freezing at whatever it last was.
export function useQuoteStatus(token) {
  const key = token == null ? null : String(token);
  const [status, setStatus] = useState(() => (key == null ? 'UNAVAILABLE' : quoteStatus(key)));

  useEffect(() => {
    if (key == null) { setStatus('UNAVAILABLE'); return undefined; }
    setStatus(quoteStatus(key));
    const unsub = PriceBus.subscribe(key, () => setStatus(quoteStatus(key)));
    const id = setInterval(() => setStatus(quoteStatus(key)), 2000);
    return () => { unsub(); clearInterval(id); };
  }, [key]);

  return status;
}