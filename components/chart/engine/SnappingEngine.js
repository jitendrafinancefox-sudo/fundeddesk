'use client';
import { findCandleIndex } from './VisibleRangeManager';

// Snaps a free cursor anchor onto candle data. Mode selects the price axis:
// 'ohlc' picks whichever of open/high/low/close is nearest, explicit modes
// (open/high/low/close) pin to that exact value. Binary search keeps this
// O(log n) even with 10k+ candles.
export function snapAnchor(anchor, candles, { magnet = false, mode = 'ohlc' } = {}) {
  if (!magnet || !candles.length) return anchor;
  const index = Math.max(0, Math.min(candles.length - 1, findCandleIndex(candles, anchor.time)));
  const candle = candles[index];
  let price;
  switch (mode) {
    case 'open': price = candle.open; break;
    case 'high': price = candle.high; break;
    case 'low': price = candle.low; break;
    case 'close': price = candle.close; break;
    default:
      price = [candle.open, candle.high, candle.low, candle.close]
        .reduce((nearest, current) => (Math.abs(current - anchor.price) < Math.abs(nearest - anchor.price) ? current : nearest), candle.open);
  }
  return { time: candle.time, price };
}
