'use client';
import { isStrokeType } from '../drawing/DrawingDefinitions';
import { strokeVisible } from '../drawing/BrushGeometry';

export function queryVisibleCandles(candles, range) {
  const from = Math.max(0, Math.floor(range.from)); const to = Math.min(candles.length - 1, Math.ceil(range.to));
  return candles.slice(from, to + 1).map((candle, offset) => ({ candle, index: from + offset }));
}

export function findCandleIndex(candles, time) {
  let low = 0; let high = candles.length - 1;
  while (low <= high) { const middle = (low + high) >> 1; const value = candles[middle].time; if (value === time) return middle; if (value < time) low = middle + 1; else high = middle - 1; }
  return low;
}

export function queryVisibleDrawings(drawings, transform) {
  return drawings.filter((drawing) => {
    if (isStrokeType(drawing.drawingType)) return strokeVisible(drawing, transform); // O(1) probes for dense strokes
    return drawing.anchorPoints.some((anchor) => transform.timeToPixel(anchor.time) != null);
  });
}
