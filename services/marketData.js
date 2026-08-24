const DEFAULT_RELAY = process.env.NEXT_PUBLIC_RELAY_URL || 'http://localhost:5001';

function json(url, signal) {
  return fetch(url, { signal }).then(async (response) => {
    if (!response.ok) throw new Error(`Market data request failed (${response.status})`);
    return response.json();
  });
}

export function createMarketDataClient(baseUrl = DEFAULT_RELAY) {
  const base = baseUrl.replace(/\/$/, '');
  return {
    health: (signal) => json(`${base}/api/health`, signal),
    optionChain: (underlying, signal) => json(`${base}/api/chain?u=${encodeURIComponent(underlying)}`, signal),
    // The relay replies with { candles: [...] } (plus an optional error string).
    // Unwrapping here keeps the provider's envelope shape isolated inside this
    // service — every consumer just receives a plain candle array.
    history: (exchange, token, interval, signal) => json(`${base}/api/history?exch=${encodeURIComponent(exchange)}&token=${encodeURIComponent(token)}&interval=${encodeURIComponent(interval)}`, signal)
      .then((payload) => (Array.isArray(payload) ? payload : payload?.candles || [])),
     ltp: (tokens, signal) => json(`${base}/api/ltp?tokens=${encodeURIComponent(tokens.join(','))}`, signal),
     heatmap: (index = 'NIFTY', signal) => json(`${base}/api/heatmap?index=${encodeURIComponent(index)}`, signal)
       .then((payload) => (Array.isArray(payload) ? payload : payload?.stocks || [])),
  };
}

export const marketData = createMarketDataClient();

export const SYMBOL_CACHE = { stocks: null, loaded: false };

export async function allStockSymbols(signal) {
  if (SYMBOL_CACHE.loaded) return SYMBOL_CACHE.stocks || [];
  try {
    const [nifty, bank] = await Promise.all([
      marketData.heatmap('NIFTY', signal),
      marketData.heatmap('BANKNIFTY', signal),
    ]);
    const merged = [...(nifty || []), ...(bank || [])];
    const seen = new Set();
    const stocks = merged.filter((row) => {
      if (!row || !row.symbol) return false;
      if (seen.has(row.symbol)) return false;
      seen.add(row.symbol);
      return true;
    }).map((row) => ({ symbol: row.symbol, token: row.token, exch: row.exch }));
    SYMBOL_CACHE.stocks = stocks;
    SYMBOL_CACHE.loaded = true;
    return stocks;
  } catch (e) {
    if (e?.name === 'AbortError') return [];
    return [];
  }
}
