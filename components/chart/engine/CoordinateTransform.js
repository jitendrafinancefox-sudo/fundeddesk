'use client';
import { findCandleIndex } from './VisibleRangeManager';

// Maps viewport pixels to stable market coordinates. Time values are always
// candle timestamps, never an on-screen index or pixel coordinate.
//
// Anchor lookups use findCandleIndex's BINARY SEARCH (nearest candle) rather
// than an exact Map hit. An exact-only lookup meant any drawing whose anchor
// time no longer matched a timestamp in the current candle window (a normal
// thing after a reload/refresh) became permanently un-hit-testable — visible,
// but impossible to select, move or resize ever again.
export function createCoordinateTransform(viewport, candles) {
  function indexForTime(time) {
    if (!candles.length || time == null) return null;
    return Math.max(0, Math.min(candles.length - 1, findCandleIndex(candles, time)));
  }
  return {
    pixelToPrice: (y) => viewport.yToPrice(y),
    priceToPixel: (price) => viewport.priceToY(price),
    pixelToIndex: (x) => viewport.xToIndex(x),
    pixelToTime: (x) => {
      const index = Math.round(viewport.xToIndex(x));
      return candles[Math.max(0, Math.min(candles.length - 1, index))]?.time ?? null;
    },
    timeToPixel: (time) => { const index = indexForTime(time); return index == null ? null : viewport.indexToX(index); },
    pixelToAnchor: (x, y) => ({ time: candles[Math.max(0, Math.min(candles.length - 1, Math.round(viewport.xToIndex(x))))]?.time ?? null, price: viewport.yToPrice(y) }),
    anchorToPixel: ({ time, price }) => { const index = indexForTime(time); return index == null ? null : { x: viewport.indexToX(index), y: viewport.priceToY(price) }; },
  };
}
