'use client';
import { findCandleIndex } from './VisibleRangeManager';

// Snaps a free cursor anchor to the nearest candle's OHLC values. Binary
// search keeps this O(log n) even with 10k+ candles (the old implementation
// scanned every candle linearly).
export function snapAnchor(anchor, candles, { magnet = false, mode = 'ohlc' } = {}) {
  if (!magnet || !candles.length) return anchor;
  const index = Math.max(0, Math.min(candles.length - 1, findCandleIndex(candles, anchor.time)));
  const candle = candles[index];
  const prices = mode === 'close' ? [candle.close] : [candle.open, candle.high, candle.low, candle.close];
  const price = prices.reduce((nearest, current) => Math.abs(current - anchor.price) < Math.abs(nearest - anchor.price) ? current : nearest, prices[0]);
  return { time: candle.time, price };
}
