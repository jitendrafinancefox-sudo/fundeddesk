'use client';
import { TimeScale } from './TimeScale';
import { PriceScale } from './PriceScale';
import { ViewportTransformer } from './ViewportTransformer';
import { ProjectionService } from './ProjectionService';

// The coordinate engine: one object that owns the time scale (horizontal),
// price scale (vertical), the DPR-aware transformer, and the cached
// projection every renderer and drawing tool consumes. It is the single
// source of truth for "where is this candle/drawing" — nothing downstream
// re-derives coordinate math.
//
// `state` is a live getter mirroring the scales, so existing renderers that
// read `viewport.state.height` / `.barWidth` keep working unchanged. Any
// mutation bumps `revision`, which invalidates the cached projection.
export class CoordinateEngine {
  constructor({ width = 1, height = 1, barWidth = 9, rightOffset = 8, pricePadding = 0.08, log = false } = {}) {
    this.timeScale = new TimeScale({ width, barWidth, rightOffset });
    this.priceScale = new PriceScale({ height, pricePadding, log });
    this.transformer = new ViewportTransformer();
    this.projection = new ProjectionService(this);
    this.revision = 0;
  }

  get state() {
    return {
      width: this.timeScale.width,
      height: this.priceScale.height,
      barWidth: this.timeScale.barWidth,
      rightOffset: this.timeScale.rightOffset,
      pricePadding: this.priceScale.pricePadding,
      priceMin: this.priceScale.priceMin,
      priceMax: this.priceScale.priceMax,
      candleCount: this.timeScale.candleCount,
      log: this.priceScale.log,
    };
  }

  _touch() { this.revision += 1; }

  setSize(width, height, dpr = 1) {
    this.timeScale.setSize(width); this.priceScale.setSize(height); this.transformer.setDpr(dpr);
    this._touch();
  }
  setDpr(dpr) { this.transformer.setDpr(dpr); this._touch(); }
  setData(candles) {
    this.timeScale.setData(candles);
    this.fitPrice(candles);
    this._touch();
  }
  fitPrice(candles) {
    const range = this.timeScale.getVisibleRange();
    const visible = candles.slice(Math.max(0, Math.floor(range.from)), Math.min(candles.length, Math.ceil(range.to) + 1));
    if (!visible.length) return;
    const low = Math.min(...visible.map((c) => c.low)); const high = Math.max(...visible.map((c) => c.high));
    this.priceScale.fit(low, high);
  }
  dragPriceScale(deltaY) { this.priceScale.dragStretch(deltaY); this._touch(); }
  resetPriceScale(candles) { this.priceScale.reset(); this.fitPrice(candles); this._touch(); }
  dragBarWidth(deltaX, anchorX) { this.timeScale.dragBarWidth(deltaX, anchorX); this._touch(); }

  getVisibleRange() { return this.timeScale.getVisibleRange(); }
  pan(deltaX) { this.timeScale.pan(deltaX); this._touch(); }
  zoom(deltaY, anchorX) { this.timeScale.zoom(deltaY, anchorX); this._touch(); }

  indexToX(index) { return this.timeScale.indexToX(index); }
  xToIndex(x) { return this.timeScale.xToIndex(x); }
  priceToY(price) { return this.priceScale.priceToY(price); }
  yToPrice(y) { return this.priceScale.yToPrice(y); }
  xToTime(candles, x) { return this.timeScale.pixelToTime(x); }
  timeToX(candles, time) { return this.timeScale.timeToPixel(time); }

  // Cache-friendly projection: same object until revision changes.
  getProjection(candles) { return this.projection.get(candles); }

  snapshot() { return { ...this.state, visibleRange: this.getVisibleRange(), revision: this.revision }; }
}
