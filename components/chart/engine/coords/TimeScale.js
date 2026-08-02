'use client';
import { clamp, niceTimeStep, timeLabel } from './CoordinateUtils';

const MIN_BAR_WIDTH = 2;
const MAX_BAR_WIDTH = 80;

// Horizontal axis: maps candle indexes ↔ pixels and candle timestamps ↔
// pixels. The layout is index-based (TradingView's bar-spacing model): the
// visible window is [to - width/barWidth, to] where `to` is the rightmost
// index, allowed to float past the data edge so "future" space (and future
// candles injected by a live feed) scrolls in smoothly.
export class TimeScale {
  constructor({ width = 1, barWidth = 9, rightOffset = 8, candleCount = 0 } = {}) {
    this.width = width; this.barWidth = barWidth; this.rightOffset = rightOffset; this.candleCount = candleCount;
    this.candles = [];           // current candle array (for time lookups)
    this.timeIndex = null;       // cached Map<time, index> — rebuilt only when candles change
    this._lookupVersion = 0;
  }

  setSize(width) { this.width = Math.max(1, width); }
  setData(candles) {
    this.candles = candles || [];
    this.candleCount = this.candles.length;
    this.rebuildLookup();
  }
  setBarWidth(barWidth) { this.barWidth = clamp(barWidth, MIN_BAR_WIDTH, MAX_BAR_WIDTH); }

  // time -> index lookup cache. Rebuilt once per candle-array change; the map
  // is only consulted for exact matches, and a binary search is the fallback
  // for timestamps that no longer exist (old drawings after a reload).
  rebuildLookup() {
    const map = new Map();
    this.candles.forEach((candle, index) => map.set(candle.time, index));
    this.timeIndex = map;
    this._lookupVersion += 1;
  }
  indexForTime(time) {
    if (!this.candles.length || time == null) return null;
    const exact = this.timeIndex?.get(time);
    if (exact != null) return exact;
    return this.binaryIndex(time);
  }
  binaryIndex(time) {
    const candles = this.candles; let low = 0; let high = candles.length - 1;
    while (low <= high) { const middle = (low + high) >> 1; const value = candles[middle].time; if (value === time) return middle; if (value < time) low = middle + 1; else high = middle - 1; }
    return Math.max(0, Math.min(candles.length - 1, low));
  }

  // --- Core layout ---------------------------------------------------------
  getVisibleRange() {
    const bars = Math.ceil(this.width / this.barWidth);
    const to = this.candleCount - 1 + this.rightOffset;
    return { from: to - bars, to };
  }
  indexToX(index) { const { to } = this.getVisibleRange(); return this.width - (to - index) * this.barWidth - this.barWidth / 2; }
  xToIndex(x) { const { to } = this.getVisibleRange(); return to - (this.width - x) / this.barWidth + 0.5; }

  // --- Transform operations (anchored at the gesture point) ----------------
  pan(deltaX) { this.rightOffset += deltaX / this.barWidth; }
  zoom(deltaY, anchorX) {
    const before = this.xToIndex(anchorX);
    this.setBarWidth(this.barWidth * (deltaY > 0 ? 0.88 : 1.14));
    const after = this.xToIndex(anchorX);
    this.rightOffset += before - after; // keep the candle under the cursor fixed
  }
  dragBarWidth(deltaX, anchorX) {
    const before = this.xToIndex(anchorX);
    this.setBarWidth(this.barWidth * Math.exp(deltaX / 160));
    const after = this.xToIndex(anchorX);
    this.rightOffset += before - after;
  }

  // --- Time conversions ----------------------------------------------------
  // time -> pixel. Linear interpolation between the two neighboring candles
  // keeps the mapping exact even with irregular time gaps (weekends, missing
  // bars); outside the data range it extrapolates using the local bar
  // spacing so future candles and drawing anchors stay visually attached.
  timeToPixel(time) {
    if (time == null || !this.candles.length) return null;
    const first = this.candles[0].time;
    const last = this.candles[this.candles.length - 1].time;
    const lastIndex = this.candles.length - 1;
    if (time < first) {
      const before = this.candles[0]; const after = this.candles[1] ?? before;
      const t = after.time !== before.time ? (time - before.time) / (after.time - before.time) : -1;
      return this.indexToX(t);
    }
    if (time > last) {
      const before = this.candles[lastIndex]; const after = this.candles[lastIndex - 1] ?? before;
      const span = before.time - after.time || 1;
      return this.indexToX(lastIndex + (time - last) / span);
    }
    const index = this.indexForTime(time);
    if (index == null) return null;
    const exact = this.candles[index].time === time;
    if (exact) return this.indexToX(index);
    const before = this.candles[index]; const after = this.candles[Math.min(index + 1, lastIndex)];
    if (before.time === after.time) return this.indexToX(index);
    return this.indexToX(index + (time - before.time) / (after.time - before.time));
  }
  // pixel -> time. Round-trips with timeToPixel: an in-range pixel maps back
  // through the same interpolation; a pixel beyond the data edge maps to an
  // extrapolated timestamp (future space).
  pixelToTime(x) {
    if (!this.candles.length) return null;
    const index = this.xToIndex(x);
    const lastIndex = this.candles.length - 1;
    if (index < 0 || index > lastIndex) {
      const edge = clamp(index, 0, lastIndex);
      const step = this.candleSpanSeconds(edge);
      return this.candles[edge].time + (index - edge) * step;
    }
    const lower = Math.floor(index); const upper = Math.ceil(index);
    if (lower === upper) return this.candles[lower].time;
    const a = this.candles[lower]; const b = this.candles[Math.min(upper, lastIndex)];
    return a.time + (index - lower) * (b.time - a.time);
  }
  candleSpanSeconds(index) {
    const lastIndex = this.candles.length - 1;
    if (index >= lastIndex) { const a = this.candles[index - 1] ?? this.candles[index]; return Math.max(1, this.candles[index].time - a.time || 1); }
    const b = this.candles[index + 1];
    return Math.max(1, b.time - this.candles[index].time || 1);
  }
  timeToIndex(time) { return this.indexForTime(time); }
  indexToTime(index) { return this.candles[clamp(Math.round(index), 0, this.candles.length - 1)]?.time ?? null; }

  // --- Time axis ticks -----------------------------------------------------
  // Aligns labels to wall-clock steps (nice step from the visible span) so
  // the axis shows stable, human-readable timestamps while zooming/panning.
  getTicks(visibleCandles, targetCount = 6) {
    if (!visibleCandles.length) return [];
    const first = visibleCandles[0].candle.time;
    const last = visibleCandles[visibleCandles.length - 1].candle.time;
    const span = Math.max(1, last - first);
    const step = niceTimeStep(span / targetCount);
    const ticks = [];
    const start = Math.ceil(first / step) * step;
    for (let time = start; time <= last; time += step) {
      const x = this.timeToPixel(time);
      if (x == null) continue;
      ticks.push({ time, x, label: timeLabel(time, span) });
    }
    return ticks;
  }
}
