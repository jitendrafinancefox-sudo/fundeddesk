'use client';
import { useCallback, useSyncExternalStore } from 'react';

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