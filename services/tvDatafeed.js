// TradingView Charting Library datafeed (JS API) backed by the local Angel One
// relay. Implements the library's datafeed interface natively — resolveSymbol,
// getBars, subscribeBars, etc. — so the relay keeps its existing REST surface
// (/api/history, /api/ltp) instead of having to implement UDF HTTP endpoints.
const RELAY_BASE = process.env.NEXT_PUBLIC_ANGEL_RELAY_URL || 'http://localhost:5001';

const INDEX_TOKENS = { 'NSE:NIFTY': '99926000', 'NSE:BANKNIFTY': '99926009', 'NSE:FINNIFTY': '99926037' };
const RESOLUTIONS = ['1', '5', '15', '60', 'D'];
const RESOLUTION_TO_INTERVAL = { '1': 'ONE_MINUTE', '5': 'FIVE_MINUTE', '15': 'FIFTEEN_MINUTE', '60': 'ONE_HOUR', 'D': 'ONE_DAY' };
const BAR_SECONDS = { '1': 60, '5': 300, '15': 900, '60': 3600, 'D': 86400 };

async function fetchJson(path, signal) {
  const response = await fetch(`${RELAY_BASE}${path}`, { signal });
  if (!response.ok) throw new Error(`Relay request failed (${response.status})`);
  return response.json();
}

function normalizeRow(row) {
  const c = Array.isArray(row) ? { time: Math.floor(Number(row[0]) / 1000), open: +row[1], high: +row[2], low: +row[3], close: +row[4], volume: +row[5] || 0 } : row;
  return { time: +c.time, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume || 0 };
}

export class TVRelayDatafeed {
  constructor() {
    this._timers = new Map();
  }

  onReady(callback) {
    setTimeout(() => callback({
      supported_resolutions: RESOLUTIONS,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_search: false,
      supports_time: true,
    }), 0);
  }

  resolveSymbol(symbolName, onResolve, onError) {
    const token = INDEX_TOKENS[symbolName];
    if (!token) { onError('Unsupported symbol'); return; }
    onResolve({
      name: symbolName,
      full_name: symbolName,
      description: symbolName.replace('NSE:', ''),
      type: 'index',
      session: '24x7',
      exchange: 'NSE',
      listed_exchange: 'NSE',
      timezone: 'Asia/Kolkata',
      minmov: 1,
      pricescale: 100,
      pointvalue: 1,
      has_intraday: true,
      has_weekly_and_monthly: true,
      supported_resolutions: RESOLUTIONS,
      volume_precision: 0,
      data_status: 'streaming',
      token,
    });
  }

  async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
    try {
      const payload = await fetchJson(`/api/history?exch=NSE&token=${symbolInfo.token}&interval=${RESOLUTION_TO_INTERVAL[resolution] || 'ONE_MINUTE'}`);
      const rows = Array.isArray(payload) ? payload : payload?.candles || [];
      const bars = rows
        .map(normalizeRow)
        .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close))
        .filter((b) => b.time * 1000 <= (periodParams.to || Infinity) * 1000)
        .sort((a, b) => a.time - b.time)
        .map((b) => ({ time: b.time * 1000, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
      onHistoryCallback(bars, { noData: !bars.length });
    } catch (err) {
      onErrorCallback?.(err);
    }
  }

  // Stream: poll the relay for the newest completed/forming bar and push it to
  // the library, which merges it into the current timescale candle.
  subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
    const interval = RESOLUTION_TO_INTERVAL[resolution] || 'ONE_MINUTE';
    const timer = window.setInterval(async () => {
      try {
        const payload = await fetchJson(`/api/history?exch=NSE&token=${symbolInfo.token}&interval=${interval}`);
        const rows = Array.isArray(payload) ? payload : payload?.candles || [];
        const last = rows[rows.length - 1];
        if (!last) return;
        const bar = normalizeRow(last);
        onRealtimeCallback({ time: bar.time * 1000, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume });
      } catch { /* relay offline — silent */ }
    }, 3000);
    this._timers.set(subscriberUID, timer);
  }

  unsubscribeBars(subscriberUID) {
    const timer = this._timers.get(subscriberUID);
    if (timer) { window.clearInterval(timer); this._timers.delete(subscriberUID); }
  }

  getTime(callback) { callback(Math.floor(Date.now() / 1000)); }

  searchSymbols() {}
  getMarks() {}
  getTimescaleMarks() {}
  calculateHistoryDepth() {}
  getBarPaddings() {}
}

export { RELAY_BASE, BAR_SECONDS };
