'use client';
import { ViewportEngine } from './ViewportEngine';
import { createCoordinateTransform } from './CoordinateTransform';
import { queryVisibleCandles, queryVisibleDrawings } from './VisibleRangeManager';
import { RenderPipeline } from './RenderPipeline';
import { GridRenderer } from '../renderers/GridRenderer';
import { CandleRenderer } from '../renderers/CandleRenderer';
import { DrawingRenderer } from '../renderers/DrawingRenderer';
import { IndicatorRenderer } from '../renderers/IndicatorRenderer';
import { SelectionRenderer } from '../renderers/SelectionRenderer';
import { CrosshairRenderer } from '../renderers/CrosshairRenderer';
import { AxisRenderer } from '../renderers/AxisRenderer';
import { TimeAxisRenderer } from '../renderers/TimeAxisRenderer';
import { CursorRenderer } from '../renderers/CursorRenderer';
import { OverlayRenderer } from '../renderers/OverlayRenderer';
import { setViewport } from '@/stores/viewportStore';

export class CanvasChartEngine {
  constructor(canvas, chartId) {
    this.canvas = canvas; this.chartId = chartId; this.viewport = new ViewportEngine();
    this.scene = { candles: [], drawings: [], indicators: [], selectedId: null, crosshair: null, cursor: null, overlays: [] };
    this.pipeline = new RenderPipeline(canvas, this.layers());
  }
  layers() {
    const scene = () => this.renderScene();
    return [
      { layer: 'base', render: (ctx) => { const s = scene(); GridRenderer(s)(ctx); CandleRenderer(s)(ctx); IndicatorRenderer(s)(ctx); AxisRenderer(s)(ctx); TimeAxisRenderer(s)(ctx); } },
      { layer: 'overlay', render: (ctx) => { const s = scene(); DrawingRenderer(s)(ctx); SelectionRenderer({ drawing: s.drawings.find((d) => d.id === s.selectedId), transform: s.transform })(ctx); CrosshairRenderer(s)(ctx); CursorRenderer(s)(ctx); OverlayRenderer(s)(ctx); } },
    ];
  }
  renderScene() {
    const transform = createCoordinateTransform(this.viewport, this.scene.candles); const visibleRange = this.viewport.getVisibleRange();
    return { ...this.scene, viewport: this.viewport, transform, visibleCandles: queryVisibleCandles(this.scene.candles, visibleRange), drawings: queryVisibleDrawings(this.scene.drawings, transform) };
  }
  resize(width, height, ratio = window.devicePixelRatio || 1) {
    this.viewport.setSize(width, height); this.canvas.width = Math.max(1, Math.floor(width * ratio)); this.canvas.height = Math.max(1, Math.floor(height * ratio)); this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
    const ctx = this.canvas.getContext('2d'); ctx?.setTransform(ratio, 0, 0, ratio, 0, 0); this.syncViewport(); this.pipeline.invalidate('full');
  }
  setCandles(candles) { this.scene.candles = candles; this.viewport.setData(candles); this.syncViewport(); this.pipeline.invalidate('full'); }
  updateLastCandle(candle) {
    const last = this.scene.candles[this.scene.candles.length - 1];
    if (last?.time === candle.time) this.scene.candles[this.scene.candles.length - 1] = candle;
    else this.scene.candles.push(candle);
    this.viewport.setData(this.scene.candles); this.syncViewport(); this.pipeline.invalidate('full');
  }
  setDrawings(drawings) { this.scene.drawings = drawings; this.pipeline.invalidate('full'); }
  setSelected(id) { this.scene.selectedId = id; this.pipeline.invalidate('full'); }
  setIndicators(indicators) { this.scene.indicators = indicators; this.pipeline.invalidate('full'); }
  setCrosshair(point) {
    const previous = this.scene.crosshair;
    if (point && this.scene.candles.length) { const index = Math.max(0, Math.min(this.scene.candles.length - 1, Math.round(this.viewport.xToIndex(point.x)))); const candle = this.scene.candles[index]; if (candle) point = { x: this.viewport.indexToX(index), y: this.viewport.priceToY(candle.close), time: candle.time, price: candle.close }; }
    else if (point) point = null; // no candle data loaded yet — nothing meaningful to show
    this.scene.crosshair = point; this.scene.cursor = (point && point.price != null) ? { ...point, label: `${point.price.toFixed(2)} · ${new Date(point.time * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}` } : null;
    // The crosshair draws full-width and full-height lines, so a small dirty
    // box around the cursor can never clear the previous frame's lines — they
    // accumulated as visible trails. Invalidate the whole frame instead; the
    // pipeline still coalesces this into a single animation frame.
    if (previous || point) this.pipeline.invalidate('full');
  }
  transform() { return createCoordinateTransform(this.viewport, this.scene.candles); }
  pan(deltaX) { this.viewport.pan(deltaX); this.viewport.fitPrice(this.scene.candles); this.syncViewport(); this.pipeline.invalidate('full'); }
  zoom(deltaY, anchorX) { this.viewport.zoom(deltaY, anchorX); this.viewport.fitPrice(this.scene.candles); this.syncViewport(); this.pipeline.invalidate('full'); }
  dragPriceScale(deltaY) { this.viewport.dragPriceScale(deltaY); this.syncViewport(); this.pipeline.invalidate('full'); }
  resetPriceScale() { this.viewport.resetPriceScale(this.scene.candles); this.syncViewport(); this.pipeline.invalidate('full'); }
  dragBarWidth(deltaX, anchorX) { this.viewport.dragBarWidth(deltaX, anchorX); this.syncViewport(); this.pipeline.invalidate('full'); }
  syncViewport() { setViewport(this.chartId, this.viewport.snapshot()); }
  destroy() { this.pipeline.destroy(); }
}
