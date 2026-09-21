export function normalizeCandle(row) {
  if (Array.isArray(row)) return { time: Math.floor(Number(row[0]) / 1000), open: +row[1], high: +row[2], low: +row[3], close: +row[4], volume: +row[5] || 0 };
  // NOTE (Phase 21A investigation): if the relay ever sends an object-shaped
  // row with a NUMERIC `row.time` in milliseconds (the array branch above
  // assumes ms and divides by 1000; this branch does not), the resulting
  // "seconds" value would be 1000x too large — a real, evidence-based risk
  // this normalizer cannot rule out without a live relay response to
  // inspect, flagged here rather than silently assumed correct.
  return { time: typeof row.time === 'number' ? row.time : Math.floor(new Date(row.time).getTime() / 1000), open: +row.open, high: +row.high, low: +row.low, close: +row.close, volume: +row.volume || 0 };
}

// A candle is only usable if every OHLC field is a real number and the
// high/low actually bound open/close (a structurally broken candle here —
// e.g. from a partial/garbled relay row — is exactly the kind of thing that
// can make autoscale compute a nonsensical price range). Rejected rows are
// logged with their raw shape, never silently dropped, so a real upstream
// data problem stays discoverable instead of just quietly vanishing.
function isValidCandle(c) {
  return Number.isFinite(c.time)
    && Number.isFinite(c.open) && Number.isFinite(c.high)
    && Number.isFinite(c.low) && Number.isFinite(c.close)
    && c.high >= Math.max(c.open, c.close, c.low)
    && c.low <= Math.min(c.open, c.close, c.high);
}

export function normalizeCandles(rows) {
  const normalized = (rows || []).map(normalizeCandle);
  const valid = [];
  for (const c of normalized) {
    if (isValidCandle(c)) { valid.push(c); continue; }
    if (typeof console !== 'undefined') console.warn('[candleAggregator] dropped malformed candle', c);
  }
  // lightweight-charts requires strictly ascending, unique timestamps —
  // sort defensively and keep the last row for any duplicate time (matches
  // how an incrementally-appended/aggregated series would resolve a repeat).
  valid.sort((a, b) => a.time - b.time);
  const deduped = [];
  for (const c of valid) {
    if (deduped.length && deduped[deduped.length - 1].time === c.time) deduped[deduped.length - 1] = c;
    else deduped.push(c);
  }
  return deduped;
}

export function aggregateTick(previous, tick, seconds) {
  const time = Math.floor(tick.time / seconds) * seconds;
  if (!previous || previous.time !== time) return { time, open: tick.price, high: tick.price, low: tick.price, close: tick.price };
  return { ...previous, high: Math.max(previous.high, tick.price), low: Math.min(previous.low, tick.price), close: tick.price };
}
