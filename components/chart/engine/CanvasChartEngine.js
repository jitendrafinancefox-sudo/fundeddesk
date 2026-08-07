'use client';
import { ViewportEngine } from './ViewportEngine';
import { createCoordinateTransform } from './CoordinateTransform';
import { queryVisibleCandles, queryVisibleDrawings } from './VisibleRangeManager';
import { onThemeChange } from './ThemeManager';
import { RenderPipeline } from './RenderPipeline';
import { GridRenderer } from '../renderers/GridRenderer';
import { CandleRenderer } from '../renderers/CandleRenderer';
import { DrawingRenderer } from '../renderers/DrawingRenderer';
import { ZoneRenderer } from '../renderers/ZoneRenderer';
import { ChannelRenderer } from '../renderers/ChannelRenderer';
import { FibRenderer } from '../renderers/FibRenderer';
import { BrushRenderer } from '../drawing/BrushRenderer';
import { PositionRenderer } from '../drawing/PositionRenderer';
import { TextRenderer } from '../drawing/TextRenderer';
import { LabelRenderer } from '../drawing/LabelRenderer';
import { ZONE_TYPES, isChannelType, isFibType, isStrokeType, isPositionType, isTextType, isLabelType } from '../drawing/DrawingDefinitions';
import { IndicatorRenderer } from '../renderers/IndicatorRenderer';
import { HandleRenderer } from '../renderers/HandleRenderer';
import { CrosshairRenderer } from '../renderers/CrosshairRenderer';
import { AxisRenderer } from '../renderers/AxisRenderer';
import { TimeAxisRenderer } from '../renderers/TimeAxisRenderer';
import { CursorRenderer } from '../renderers/CursorRenderer';
import { OverlayRenderer } from '../renderers/OverlayRenderer';

export class CanvasChartEngine {
  constructor(canvas, chartId) {
    this.canvas = canvas; this.chartId = chartId; this.viewport = new ViewportEngine();
    this.scene = { candles: [], drawings: [], indicators: [], selectedIds: [], crosshair: null, cursor: null, overlays: [], marquee: null, pendingDrawing: null, hover: null, tool: 'cursor', pointEditId: null };
    // Offscreen canvas holding the cached base layer (grid, candles,
    // indicators, axes, static drawings). Overlay updates (crosshair,
    // marquee, previews) blit it and never repaint the base.
    this.baseCanvas = document.createElement('canvas');
    this.pipeline = new RenderPipeline(canvas, this.layers(), this.baseCanvas);
    this.pipeline.setSceneFactory(() => this.renderScene());
    // Theme flips invalidate the cached base layer (its pixels are stale).
    this.offThemeChange = onThemeChange(() => this.pipeline.invalidate('full'));
  }
  layers() {
    // Base layer renders into the offscreen cache; overlay layer renders onto
    // the visible canvas after the cache is blitted. The scene is built once
    // per flush by the pipeline and passed to every renderer.
    return {
      base: [
        (ctx, s) => GridRenderer(s)(ctx),
        (ctx, s) => CandleRenderer(s)(ctx),
        (ctx, s) => IndicatorRenderer(s)(ctx),
        (ctx, s) => AxisRenderer(s)(ctx),
        (ctx, s) => TimeAxisRenderer(s)(ctx),
        (ctx, s) => ZoneRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx),
        (ctx, s) => PositionRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx),
        (ctx, s) => TextRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx),
        (ctx, s) => LabelRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx),
        (ctx, s) => ChannelRenderer(s)(ctx),
        (ctx, s) => FibRenderer(s)(ctx),
        (ctx, s) => BrushRenderer(s)(ctx),
        (ctx, s) => DrawingRenderer({ ...s, selectedIds: s.selectedIds, hoverId: s.hoverId })(ctx),
      ],
      overlay: [
        (ctx, s) => {
          const pending = s.pendingDrawing;
          if (!pending) return;
          if (ZONE_TYPES.includes(pending.drawingType)) ZoneRenderer({ ...s, drawings: [pending], selectedId: null })(ctx);
          else if (isPositionType(pending.drawingType)) PositionRenderer({ ...s, drawings: [pending], selectedId: null })(ctx);
          else if (isTextType(pending.drawingType) && !isLabelType(pending.drawingType)) TextRenderer({ ...s, drawings: [pending], selectedId: null })(ctx);
          else if (isLabelType(pending.drawingType)) LabelRenderer({ ...s, drawings: [pending], selectedId: null })(ctx);
          else if (isChannelType(pending.drawingType)) ChannelRenderer({ ...s, drawings: [pending] })(ctx);
          else if (isFibType(pending.drawingType)) FibRenderer({ ...s, drawings: [pending] })(ctx);
          else if (isStrokeType(pending.drawingType)) BrushRenderer({ ...s, drawings: [pending] })(ctx);
          else DrawingRenderer({ ...s, drawings: [pending], selectedId: null })(ctx);
        },
        (ctx, s) => HandleRenderer({ drawings: s.selectedDrawings, transform: s.transform, hover: s.hover, visible: s.handlesVisible, pointEditId: s.pointEditId })(ctx),
        (ctx, s) => {
          if (!s.marquee) return;
          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(77,124,254,.9)'; ctx.lineWidth = 1;
          ctx.strokeRect(s.marquee.x, s.marquee.y, s.marquee.width, s.marquee.height); ctx.restore();
        },
        (ctx, s) => CrosshairRenderer(s)(ctx),
        (ctx, s) => CursorRenderer(s)(ctx),
        (ctx, s) => OverlayRenderer(s)(ctx),
      ],
    };
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
      positionDrawings: drawings.filter((drawing) => isPositionType(drawing.drawingType)),
      textDrawings: drawings.filter((drawing) => isTextType(drawing.drawingType) && !isLabelType(drawing.drawingType)),
      labelDrawings: drawings.filter((drawing) => isLabelType(drawing.drawingType)),
      selectedDrawings: this.scene.drawings.filter((drawing) => selected.has(drawing.id)),
      hoverId: this.scene.hover?.id || null,
      handlesVisible: this.scene.tool === 'cursor' && !this.scene.pendingDrawing,
    };
  }
  setSpatialQuery(fn) { this.spatialQuery = fn; }
  resize(width, height, ratio = window.devicePixelRatio || 1) {
    this.viewport.setSize(width, height, ratio);
    const w = Math.max(1, Math.floor(width * ratio)); const h = Math.max(1, Math.floor(height * ratio));
    this.canvas.width = w; this.canvas.height = h;
    this.canvas.style.width = `${width}px`; this.canvas.style.height = `${height}px`;
    this.baseCanvas.width = w; this.baseCanvas.height = h;
    const ctx = this.canvas.getContext('2d'); ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    const bctx = this.baseCanvas.getContext('2d'); bctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.pipeline.ratio = ratio;
    this.pipeline.invalidate('full');
  }
  setCandles(candles) { this.scene.candles = candles; this.viewport.setData(candles); this.pipeline.invalidate('full'); }
  updateLastCandle(candle) {
    const last = this.scene.candles[this.scene.candles.length - 1];
    if (last?.time === candle.time) this.scene.candles[this.scene.candles.length - 1] = candle;
    else this.scene.candles.push(candle);
    this.viewport.setData(this.scene.candles); this.pipeline.invalidate('full');
  }
  setDrawings(drawings, rect = null) { this.scene.drawings = drawings; this.pipeline.invalidate(rect ? 'rect' : 'full', rect); }
  setSelected(ids) { this.scene.selectedIds = Array.isArray(ids) ? ids : (ids == null ? [] : [ids]); this.pipeline.invalidate('full'); }
  setHover(hover) {
    const same = Boolean(hover && this.scene.hover && hover.id === this.scene.hover.id && hover.kind === this.scene.hover.kind && hover.anchorIndex === this.scene.hover.anchorIndex);
    if (same) return;
    this.scene.hover = hover; this.pipeline.invalidate('full');
  }
  setToolMode(tool) { this.scene.tool = tool; this.pipeline.invalidate('overlay'); }
  setPointEdit(id) { this.scene.pointEditId = id || null; this.pipeline.invalidate('overlay'); }
  setMarquee(rect) { this.scene.marquee = rect; this.pipeline.invalidate('overlay'); }
  setPendingDrawing(drawing) { this.scene.pendingDrawing = drawing; this.pipeline.invalidate('overlay'); }
  setIndicators(indicators) { this.scene.indicators = indicators; this.pipeline.invalidate('full'); }
  setCrosshair(point) {
    const previous = this.scene.crosshair;
    if (point && this.scene.candles.length) {
      const index = Math.max(0, Math.min(this.scene.candles.length - 1, Math.round(this.viewport.xToIndex(point.x))));
      const candle = this.scene.candles[index];
      if (candle) {
        point = { x: this.viewport.indexToX(index), y: this.viewport.priceToY(candle.close), time: candle.time, price: candle.close, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume };
      } else {
        point = previous; // keep previous crosshair if candle not found
      }
    } else if (point && !this.scene.candles.length) {
      return; // don't update crosshair while loading
    }
    this.scene.crosshair = point;
    this.scene.cursor = (point && point.price != null) ? { ...point, label: `${point.price.toFixed(2)} · ${new Date(point.time * 1000).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}` } : null;
    if (previous || point) this.pipeline.invalidate('overlay');
  }
  transform() { return createCoordinateTransform(this.viewport, this.scene.candles); }
  pan(deltaX) { this.viewport.pan(deltaX); this.viewport.fitPrice(this.scene.candles); this.pipeline.invalidate('full'); }
  zoom(deltaY, anchorX) { this.viewport.zoom(deltaY, anchorX); this.viewport.fitPrice(this.scene.candles); this.pipeline.invalidate('full'); }
  dragPriceScale(deltaY) { this.viewport.dragPriceScale(deltaY); this.pipeline.invalidate('full'); }
  resetPriceScale() { this.viewport.resetPriceScale(this.scene.candles); this.pipeline.invalidate('full'); }
  dragBarWidth(deltaX, anchorX) { this.viewport.dragBarWidth(deltaX, anchorX); this.pipeline.invalidate('full'); }
  destroy() { this.offThemeChange?.(); this.pipeline.destroy(); this.baseCanvas = null; }
}
