export const SYNC_EVENTS = {
  CROSSHAIR: 'crosshair',
  SYMBOL: 'symbol',
  TIMEFRAME: 'timeframe',
  VISIBLE_RANGE: 'visibleRange',
};

export function createSyncBus() {
  const listeners = new Map();
  return {
    on(event, callback) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(callback);
      return () => this.off(event, callback);
    },
    off(event, callback) {
      const set = listeners.get(event);
      if (set) set.delete(callback);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      set.forEach((callback) => {
        try {
          callback(payload);
        } catch {
          /* listener errors must not break the bus */
        }
      });
    },
    clear() {
      listeners.clear();
    },
    get size() {
      let count = 0;
      listeners.forEach((set) => {
        count += set.size;
      });
      return count;
    },
  };
}

export class TVSyncBridge {
  constructor(options = {}) {
    this.bus = options.bus || createSyncBus();
    this.scope = options.scope || 'pane-1';
    this.chart = options.chart || null;
    this.handlers = new Map();
  }

  attach(chart) {
    this.chart = chart;
    return this;
  }

  syncCrosshair(payload) {
    this.bus.emit(SYNC_EVENTS.CROSSHAIR, { scope: this.scope, payload });
  }

  syncSymbol(symbol) {
    this.bus.emit(SYNC_EVENTS.SYMBOL, { scope: this.scope, payload: symbol });
  }

  syncTimeframe(interval) {
    this.bus.emit(SYNC_EVENTS.TIMEFRAME, { scope: this.scope, payload: interval });
  }

  syncVisibleRange(range) {
    this.bus.emit(SYNC_EVENTS.VISIBLE_RANGE, { scope: this.scope, payload: range });
  }

  listen(event, callback) {
    const unsubscribe = this.bus.on(event, callback);
    this.handlers.set(callback, unsubscribe);
    return unsubscribe;
  }

  destroy() {
    this.handlers.forEach((unsubscribe) => unsubscribe());
    this.handlers.clear();
    this.bus.clear();
    this.chart = null;
  }
}
