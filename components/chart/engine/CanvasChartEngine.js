'use client';
import { ViewportEngine } from './ViewportEngine';
import { createCoordinateTransform } from './CoordinateTransform';
import { queryVisibleCandles, queryVisibleDrawings } from './VisibleRangeManager';
import { RenderPipeline } from './RenderPipeline';
import { GridRenderer } from '../renderers/GridRenderer';
import { CandleRenderer } from '../renderers/CandleRenderer';
import { DrawingRenderer } from '../renderers/DrawingRenderer';
import { ZoneRenderer } from '../renderers/ZoneRenderer';
import { ChannelRenderer } from '../renderers/ChannelRenderer';
import { FibRenderer } from '../renderers/FibRenderer';
import { BrushRenderer } from '../drawing/BrushRenderer';
import { ZONE_TYPES, isChannelType, isFibType, isStrokeType } from '../drawing/DrawingDefinitions';
import { IndicatorRenderer } from '../renderers/IndicatorRenderer';
import { HandleRenderer } from '../renderers/HandleRenderer';
import { CrosshairRenderer } from '../renderers/CrosshairRenderer';
import { AxisRenderer } from '../renderers/AxisRenderer';
import { TimeAxisRenderer } from '../renderers/TimeAxisRenderer';
import { CursorRenderer } from '../renderers/CursorRenderer';
import { OverlayRenderer } from '../renderers/OverlayRenderer';
import { setViewport } from '@/stores/viewportStore';

export class CanvasChartEngine {
  constructor(canvas, chartId) {
    this.canvas = canvas; this.chartId = chartId; this.viewport = new ViewportEngine();
    this.scene = { candles: [], drawings: [], indicators: [], selectedIds: [], crosshair: null, cursor: null, overlays: [], marquee: null, pendingDrawing: null, hover: null, tool: 'cursor', pointEditId: null };
    this.pipeline = new RenderPipeline(canvas, this.layers());
  }
  layers() {
    const scene = () => this.renderScene();
    return [
      { layer: 'base', render: (ctx) => { const s = scene(); GridRenderer(s)(ctx); CandleRenderer(s)(ctx); IndicatorRenderer(s)(ctx); AxisRenderer(s)(ctx); TimeAxisRenderer(s)(ctx); } },
      { layer: 'overlay', render: (ctx) => { const s = scene(); const pending = s.pendingDrawing; ZoneRenderer({ ...s, drawings: s.zones, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx); ChannelRenderer({ ...s, drawings: pending && isChannelType(pending.drawingType) ? [...s.channels, pending] : s.channels })(ctx); FibRenderer({ ...s, drawings: pending && isFibType(pending.drawingType) ? [...s.fibDrawings, pending] : s.fibDrawings })(ctx); BrushRenderer({ ...s, drawings: pending && isStrokeType(pending.drawingType) ? [...s.strokeDrawings, pending] : s.strokeDrawings })(ctx); DrawingRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx); if (pending && !isChannelType(pending.drawingType) && !isFibType(pending.drawingType) && !isStrokeType(pending.drawingType)) DrawingRenderer({ ...s, drawings: [pending], selectedId: null })(ctx); HandleRenderer({ drawings: s.selectedDrawings, transform: s.transform, hover: s.hover, visible: s.handlesVisible, pointEditId: s.pointEditId })(ctx); if (s.marquee) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(77,124,254,.9)'; ctx.lineWidth = 1; ctx.strokeRect(s.marquee.x, s.marquee.y, s.marquee.width, s.marquee.height); ctx.restore(); } CrosshairRenderer(s)(ctx); CursorRenderer(s)(ctx); OverlayRenderer(s)(ctx); } },
    ];
  }
  renderScene() {
    const transform = this.transform(); const visibleRange = this.viewport.getVisibleRange();
    let drawings = queryVisibleDrawings(this.scene.drawings, transform);
    if (this.spatialQuery && this.scene.candles.length) {
      const fromIndex = Math.max(0, Math.floor(visibleRange.from)); const toIndex = Math.min(this.scene.candles.length - 1, Math.ceil(visibleRange.to));
      const fromTime = this.scene.candles[fromIndex]?.time; const toTime = this.scene.candles[toIndex]?.time;
      if (fromTime != null && toTime != null) { const ids = new Set(this.spatialQuery(fromTime, toTime)); drawings = this.scene.drawings.filter((drawing) => ids.has(drawing.id)); }
    }
    const selected = new Set(this.scene.selectedIds);
    const visibleCandles = queryVisibleCandles(this.scene.candles, visibleRange);
    return {
      ...this.scene, viewport: this.viewport, transform,
      visibleCandles,
      priceTicks: this.viewport.priceScale.getTicks(),
      timeTicks: this.viewport.timeScale.getTicks(visibleCandles),
      drawings, zones: drawings.filter((drawing) => ZONE_TYPES.includes(drawing.drawingType)),
      channels: drawings.filter((drawing) => isChannelType(drawing.drawingType)),
      fibDrawings: drawings.filter((drawing) => isFibType(drawing.drawingType)),
      strokeDrawings: drawings.filter((drawing) => isStrokeType(drawing.drawingType)),
      selectedDrawings: this.scene.drawings.filter((drawing) => selected.has(drawing.id)),
      hoverId: this.scene.hover?.id || null,
      handlesVisible: this.scene.tool === 'cursor' && !this.scene.pendingDrawing,
    };
  }
  setSpatialQuery(fn) { this.spatialQuery = fn; }
  resize(width, height, ratio = window.devicePixelRatio || 1) {
    this.viewport.setSize(width, height, ratio); this.canvas.width = Math.max(1, Math.floor(width * ratio)); this.canvas.height = Math.max(1, Math.floor(height * ratio)); this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
    const ctx = this.canvas.getContext('2d'); ctx?.setTransform(ratio, 0, 0, ratio, 0, 0); this.syncViewport(); this.pipeline.invalidate('full');
  }
  setCandles(candles) { this.scene.candles = candles; this.viewport.setData(candles); this.syncViewport(); this.pipeline.invalidate('full'); }
  updateLastCandle(candle) {
    const last = this.scene.candles[this.scene.candles.length - 1];
    if (last?.time === candle.time) this.scene.candles[this.scene.candles.length - 1] = candle;
    else this.scene.candles.push(candle);
    this.viewport.setData(this.scene.candles); this.syncViewport(); this.pipeline.invalidate('full');
  }
  setDrawings(drawings, rect = null) { this.scene.drawings = drawings; this.pipeline.invalidate(rect ? 'rect' : 'full', rect); }
  setSelected(ids) { this.scene.selectedIds = Array.isArray(ids) ? ids : (ids == null ? [] : [ids]); this.pipeline.invalidate('full'); }
  setHover(hover) {
    const same = Boolean(hover && this.scene.hover && hover.id === this.scene.hover.id && hover.kind === this.scene.hover.kind && hover.anchorIndex === this.scene.hover.anchorIndex);
    if (same) return;
    this.scene.hover = hover; this.pipeline.invalidate('full');
  }
  setToolMode(tool) { this.scene.tool = tool; this.pipeline.invalidate('full'); }
  setPointEdit(id) { this.scene.pointEditId = id || null; this.pipeline.invalidate('full'); }
  setMarquee(rect) { this.scene.marquee = rect; this.pipeline.invalidate(rect ? 'rect' : 'full', rect); }
  setPendingDrawing(drawing, rect = null) { this.scene.pendingDrawing = drawing; this.pipeline.invalidate(rect ? 'rect' : 'full', rect); }
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
