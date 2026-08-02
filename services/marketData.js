const DEFAULT_RELAY = process.env.NEXT_PUBLIC_ANGEL_RELAY_URL || 'http://localhost:5001';

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
  };
}

export const marketData = createMarketDataClient();
