'use client';

const MIN_BAR_WIDTH = 2;
const MAX_BAR_WIDTH = 80;

// Owns only viewport math. It has no knowledge of a canvas, data provider,
// drawings, or renderer; consumers receive immutable snapshots.
export class ViewportEngine {
  constructor({ width = 1, height = 1, barWidth = 9, rightOffset = 8, pricePadding = 0.08 } = {}) {
    this.state = { width, height, barWidth, rightOffset, pricePadding, priceMin: 0, priceMax: 1, candleCount: 0 };
    this.manualPriceScale = false; // true while the user is dragging the price axis (auto-fit paused)
  }
  snapshot() { return { ...this.state, visibleRange: this.getVisibleRange() }; }
  setSize(width, height) { this.state.width = Math.max(1, width); this.state.height = Math.max(1, height); }
  setData(candles) { this.state.candleCount = candles.length; this.fitPrice(candles); }
  fitPrice(candles) {
    if (this.manualPriceScale) return; // user has manually scaled the axis — don't fight their drag
    const range = this.getVisibleRange(); const visible = candles.slice(Math.max(0, range.from), Math.min(candles.length, range.to + 1));
    if (!visible.length) return;
    const low = Math.min(...visible.map((c) => c.low)); const high = Math.max(...visible.map((c) => c.high)); const spread = Math.max(high - low, Math.abs(high) * 0.001, 1);
    this.state.priceMin = low - spread * this.state.pricePadding; this.state.priceMax = high + spread * this.state.pricePadding;
  }
  // Drag the price axis (right edge) up/down to stretch or compress the
  // candles vertically — pulls the axis into manual mode so live data
  // doesn't keep auto-fitting the scale back underneath the user's drag.
  dragPriceScale(deltaY) {
    this.manualPriceScale = true;
    const { priceMin, priceMax } = this.state;
    const mid = (priceMin + priceMax) / 2;
    const factor = Math.exp(deltaY / 220); // smooth, continuous stretch
    const half = ((priceMax - priceMin) / 2) * factor;
    this.state.priceMin = mid - half; this.state.priceMax = mid + half;
  }
  resetPriceScale(candles) { this.manualPriceScale = false; this.fitPrice(candles); }
  // Drag the time axis (bottom edge) left/right to make candles thicker or
  // thinner, anchored at the drag's starting x so the chart doesn't jump.
  dragBarWidth(deltaX, anchorX) {
    const before = this.xToIndex(anchorX);
    const factor = Math.exp(deltaX / 160);
    this.state.barWidth = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, this.state.barWidth * factor));
    const after = this.xToIndex(anchorX); this.state.rightOffset += before - after;
  }
  getVisibleRange() {
    const bars = Math.ceil(this.state.width / this.state.barWidth); const to = Math.floor(this.state.candleCount - 1 + this.state.rightOffset); return { from: to - bars, to };
  }
  pan(deltaX) { this.state.rightOffset += deltaX / this.state.barWidth; }
  zoom(deltaY, anchorX) {
    const before = this.xToIndex(anchorX); const scale = deltaY > 0 ? 0.88 : 1.14;
    this.state.barWidth = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, this.state.barWidth * scale));
    const after = this.xToIndex(anchorX); this.state.rightOffset += before - after;
  }
  indexToX(index) { const { to } = this.getVisibleRange(); return this.state.width - (to - index + 0.5) * this.state.barWidth; }
  xToIndex(x) { const { to } = this.getVisibleRange(); return to - (this.state.width - x) / this.state.barWidth + 0.5; }
  priceToY(price) { const { priceMin, priceMax, height } = this.state; const range = priceMax - priceMin; return range ? ((priceMax - price) / range) * height : height / 2; }
  yToPrice(y) { const { priceMin, priceMax, height } = this.state; return priceMax - (y / height) * (priceMax - priceMin); }
  xToTime(candles, x) { const index = Math.max(0, Math.min(candles.length - 1, Math.round(this.xToIndex(x)))); return candles[index]?.time ?? null; }
  timeToX(candles, time) { const index = candles.findIndex((candle) => candle.time === time); return index < 0 ? null : this.indexToX(index); }
}
