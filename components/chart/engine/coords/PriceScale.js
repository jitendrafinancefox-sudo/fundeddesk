'use client';
import { clamp, niceStep, fmtPrice } from './CoordinateUtils';

// TradingView-style vertical axis: maps price ↔ pixels.
// topPadding = 8% of chart height, bottomPadding = 4% of chart height.
// Linear by default; log mode flag wired in.
export class PriceScale {
  constructor({ height = 1, priceMin = 0, priceMax = 1, pricePadding = 0.08, log = false } = {}) {
    this.height = height; this.priceMin = priceMin; this.priceMax = priceMax; this.pricePadding = pricePadding;
    this.log = log; this.manual = false;
  }

  get topPadding() { return Math.round(this.height * 0.005); }
  get bottomPadding() { return Math.round(this.height * 0.005); }

  setSize(height) { this.height = Math.max(1, height); }
  setLogMode(log) { this.log = Boolean(log); this._recomputeBounds(); }

  // Auto-fit: expand [low, high] by the padding ratio (~8% per side,
  // TradingView's default margin), anchored on the spread. Symmetric so the
  // visible candles stay vertically centered.
  fit(low, high) {
    if (this.manual) return;
    if (!Number.isFinite(low) || !Number.isFinite(high)) return;
    const spread = Math.max(high - low, Math.abs(high) * 0.001, 1);
    const padded = spread * 0.08;
    this.priceMin = low - padded; this.priceMax = high + padded;
    this._recomputeBounds();
  }
  // Drag the right edge: stretch/compress the scale around its midpoint.
  dragStretch(deltaY) {
    this.manual = true;
    const mid = (this.priceMin + this.priceMax) / 2;
    const factor = Math.exp(deltaY / 220);
    const half = ((this.priceMax - this.priceMin) / 2) * factor;
    this.priceMin = mid - half; this.priceMax = mid + half;
    this._recomputeBounds();
  }
  reset() { this.manual = false; }

  // Internal: normalized domain used by both linear and log mapping.
  _recomputeBounds() {
    if (this.log) { this._lo = Math.max(this.priceMin, 1e-9); this._hi = Math.max(this.priceMax, 1e-9); }
  }
  _u(price) {
    if (this.log) { const p = Math.max(price, 1e-9); return (Math.log(p) - Math.log(this._lo)) / (Math.log(this._hi) - Math.log(this._lo)); }
    const range = this.priceMax - this.priceMin || 1;
    return (price - this.priceMin) / range;
  }

  priceToY(price) {
    const chartH = this.height - this.topPadding - this.bottomPadding;
    return this.topPadding + (1 - this._u(price)) * chartH;
  }
  yToPrice(y) {
    const chartH = this.height - this.topPadding - this.bottomPadding;
    const u = clamp(1 - (y - this.topPadding) / chartH, 0, 1);
    if (this.log) return this._lo * (this._hi / this._lo) ** u;
    return this.priceMin + u * (this.priceMax - this.priceMin);
  }

  // TradingView-style ticks: dynamic target count based on available height,
  // nice round intervals, major/minor classification for grid rendering.
  getTicks(targetCount) {
    const chartH = this.height - this.topPadding - this.bottomPadding;
    const count = targetCount || Math.max(4, Math.min(12, Math.floor(chartH / 50)));
    const range = Math.abs(this.priceMax - this.priceMin);
    if (!(range > 0)) return [];
    const step = niceStep(range / count);
    const minorStep = step / 5;
    const ticks = [];
    const start = Math.floor(this.priceMin / step) * step;

    // Major ticks
    for (let price = start; price <= this.priceMax + step * 1e-9; price += step) {
      const y = this.priceToY(price);
      if (y < this.topPadding - 4 || y > this.height - this.bottomPadding + 4) continue;
      ticks.push({ price, y, label: fmtPrice(price, step), major: true, step });
    }

    // Minor ticks (no labels, just positions for grid)
    const minorStart = Math.floor(this.priceMin / minorStep) * minorStep;
    for (let price = minorStart; price <= this.priceMax + minorStep * 1e-9; price += minorStep) {
      const y = this.priceToY(price);
      if (y < this.topPadding - 4 || y > this.height - this.bottomPadding + 4) continue;
      // Skip if this is a major tick position
      const isMajor = ticks.some(t => Math.abs(t.price - price) < step * 1e-9);
      if (!isMajor) {
        ticks.push({ price, y, major: false });
      }
    }

    return ticks;
  }
}
