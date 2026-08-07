'use client';
import { clamp, niceTimeStep } from './CoordinateUtils';
import { PRICE_AXIS_W } from './AxisConstants';

const MIN_BAR_WIDTH = 2;
const MAX_BAR_WIDTH = 80;

// Horizontal axis: maps candle indexes ↔ pixels and candle timestamps ↔
// pixels. The layout is index-based (TradingView's bar-spacing model): the
// visible window is [to - plotWidth/barWidth, to] where `to` is the rightmost
// index, allowed to float past the data edge so "future" space (and future
// candles injected by a live feed) scrolls in smoothly.
//
// `width` is the full canvas width (used by the axis renderers, which draw the
// right-side price strip themselves); `plotWidth` is the candle-plot width and
// IS the coordinate space indexToX/xToIndex work in. Keeping the two separate
// makes candles sit fully inside the plot area instead of being clipped under
// the price axis.
export class TimeScale {
  constructor({ width = 1, barWidth = 7, rightOffset = 2.5, candleCount = 0 } = {}) {
    this.width = width; this.plotWidth = Math.max(1, width - PRICE_AXIS_W);
    this.barWidth = barWidth; this.rightOffset = rightOffset; this.candleCount = candleCount;
    this.candles = [];           // current candle array (for time lookups)
    this.timeIndex = null;       // cached Map<time, index> — rebuilt only when candles change
    this._lookupVersion = 0;
  }

  setSize(width) { this.width = Math.max(1, width); this.plotWidth = Math.max(1, width - PRICE_AXIS_W); }
  setData(candles) {
    candles = candles || [];
    const prev = this.candles;
    const prevTail = prev.length ? prev[prev.length - 1] : null;
    const nextTail = candles.length ? candles[candles.length - 1] : null;
    // A live tick replaces the last candle (same time) — the time→index map is
    // unchanged, so skip the rebuild. Rebuilds happen only when a new candle
    // is appended or the array is swapped entirely.
    const sameTail = prevTail && nextTail && prevTail.time === nextTail.time;
    this.candles = candles;
    this.candleCount = candles.length;
    if (!sameTail) this.rebuildLookup();
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
    const bars = Math.ceil(this.plotWidth / this.barWidth);
    const to = this.candleCount - 1 + this.rightOffset;
    return { from: to - bars, to };
  }
  indexToX(index) { const { to } = this.getVisibleRange(); return this.plotWidth - (to - index) * this.barWidth - this.barWidth / 2; }
  xToIndex(x) { const { to } = this.getVisibleRange(); return to - (this.plotWidth - x) / this.barWidth + 0.5; }

  // --- Transform operations (anchored at the gesture point) ----------------
  pan(deltaX) { this.rightOffset -= deltaX / this.barWidth; }
  zoom(deltaY, anchorX) {
    const before = this.xToIndex(anchorX);
    // Delta-proportional factor: a wheel notch (~±100-120) zooms a sensible
    // step while trackpad pinch events (many tiny deltas) accumulate smoothly.
    const factor = Math.exp(-deltaY / 700);
    this.setBarWidth(this.barWidth * clamp(factor, 0.55, 1.8));
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
  // Wall-clock ticks (nice step from the visible span) snapped to the CENTER
  // of the first candle at-or-after each tick time, so labels always sit
  // directly under a candle like TradingView. Ticks that fall into a data gap
  // (weekend/holiday) collapse onto the next candle; duplicates are dropped.
  // `ticks.step` tells the renderer whether the axis is in intraday (HH:MM) or
  // date mode (dd MMM + month names).
  getTicks(visibleCandles, targetCount = 6) {
    if (!visibleCandles.length) return [];
    const first = visibleCandles[0].candle.time;
    const last = visibleCandles[visibleCandles.length - 1].candle.time;
    const span = Math.max(1, last - first);
    const step = niceTimeStep(span / Math.max(2, targetCount));
    const ticks = [];
    ticks.step = step;
    const start = Math.ceil(first / step) * step;
    let idx = 0;
    let prevCandleIndex = -1;
    for (let time = start; time <= last + step * 1e-6; time += step) {
      while (idx < visibleCandles.length - 1 && visibleCandles[idx].candle.time < time) idx += 1;
      const entry = visibleCandles[idx];
      if (!entry) break;
      if (entry.index === prevCandleIndex) continue;
      prevCandleIndex = entry.index;
      ticks.push({ time: entry.candle.time, x: this.indexToX(entry.index), candle: entry.candle, index: entry.index });
    }
    // Always label the first visible candle so the axis never starts empty.
    if (!ticks.length || ticks[0].index !== visibleCandles[0].index) {
      ticks.unshift({ time: visibleCandles[0].candle.time, x: this.indexToX(visibleCandles[0].index), candle: visibleCandles[0].candle, index: visibleCandles[0].index });
    }
    return ticks;
  }
}
