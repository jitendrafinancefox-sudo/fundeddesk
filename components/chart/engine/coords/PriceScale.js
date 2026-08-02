'use client';
import { clamp, niceStep, fmtPrice } from './CoordinateUtils';

const MIN_TICK_SPACING = 34; // px between horizontal gridlines at 6 targets

// Vertical axis: maps price ↔ pixels. Linear by default; a log mode flag is
// wired into the mapping so switching scale types later touches one property
// instead of every renderer.
export class PriceScale {
  constructor({ height = 1, priceMin = 0, priceMax = 1, pricePadding = 0.08, log = false } = {}) {
    this.height = height; this.priceMin = priceMin; this.priceMax = priceMax; this.pricePadding = pricePadding;
    this.log = log; this.manual = false; // true while the user drags the axis (auto-fit paused)
  }

  setSize(height) { this.height = Math.max(1, height); }
  setLogMode(log) { this.log = Boolean(log); this._recomputeBounds(); }

  // Auto-fit: expand [low, high] by a small padding ratio, anchored on the
  // spread. Skipped entirely while the user is dragging the axis.
  fit(low, high) {
    if (this.manual) return;
    if (!Number.isFinite(low) || !Number.isFinite(high)) return;
    const spread = Math.max(high - low, Math.abs(high) * 0.001, 1);
    const padded = spread * this.pricePadding;
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

  priceToY(price) { return (1 - this._u(price)) * this.height; }
  yToPrice(y) {
    const u = clamp(1 - y / this.height, 0, 1);
    if (this.log) return this._lo * (this._hi / this._lo) ** u;
    return this.priceMin + u * (this.priceMax - this.priceMin);
  }

  // "Nice" horizontal ticks: step chosen from 1/2/2.5/5×10^n, labels aligned
  // to that step so the grid and price labels always line up while zooming.
  getTicks(targetCount = 6) {
    const range = Math.abs(this.priceMax - this.priceMin);
    if (!(range > 0)) return [];
    const step = niceStep(range / targetCount);
    const ticks = [];
    const start = Math.ceil(this.priceMin / step) * step;
    for (let price = start; price <= this.priceMax + step * 1e-9; price += step) {
      const y = this.priceToY(price);
      if (y < -8 || y > this.height + 8) continue;
      ticks.push({ price, y, label: fmtPrice(price, step) });
    }
    return ticks;
  }
}
