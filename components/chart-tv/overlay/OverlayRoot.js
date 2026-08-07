'use client';
import { createEventBus } from '@/components/chart/drawing/EventBus';
import { createObjectRegistry } from '@/components/chart/drawing/ObjectRegistry';
import { createLayerManager } from '@/components/chart/drawing/LayerManager';
import { createToolManager } from '@/components/chart/drawing/ToolManager';
import { createDrawing } from '@/components/chart/engine/DrawingSchema';
import { createHoverManager } from '@/components/chart/interaction/HoverManager';
import { DrawingInteraction } from '@/components/chart/engine/DrawingInteraction';
import { isShapeType, isRegressionType, isPositionType, isTextType, normalizeShapeAnchors } from '@/components/chart/drawing/DrawingDefinitions';
import { fitLinearRegression } from '@/components/chart/drawing/ChannelGeometry';
import { createOverlayViewport } from './OverlayViewport';
import { createOverlayRenderer } from './OverlayRenderer';
import { createOverlaySelection } from './OverlaySelection';
import { createOverlayHandles } from './OverlayHandles';
import { createOverlayHistory } from './OverlayHistory';
import { createOverlaySerialization } from './OverlaySerialization';
import { createOverlayHitTest } from './OverlayHitTest';
import { createOverlayEvents } from './OverlayEvents';
import { createOverlaySnapping } from './OverlaySnapping';
import { createOverlayCursor } from './OverlayCursor';
import { createOverlayProperties } from './OverlayProperties';

const LAYER_NAMES = ['drawings', 'selection', 'handles', 'preview'];

function createCanvas(className) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'block',
  });
  return canvas;
}

export function createOverlayRoot({
  container,
  tvChart,
  chartKey,
  identity,
  snap: snapConfig = { magnet: true, mode: 'ohlc' },
  activeRef = null,
  debounceMs = 500,
  onReady = null,
  onDrawingsChange = null,
  onSelectionChange = null,
  onContextMenu = null,
  onProperties = null,
}) {
  if (!container || !tvChart?.chart) throw new Error('OverlayRoot requires a container and a mounted TVChart');

  // --- Layer canvases -------------------------------------------------------
  const canvases = {};
  LAYER_NAMES.forEach((name) => { const c = createCanvas(`fd-overlay-${name}`); container.appendChild(c); canvases[name] = c; });
  const drawingsCanvas = canvases.drawings;
  const selectionCanvas = canvases.selection;
  const handlesCanvas = canvases.handles;
  const previewCanvas = canvases.preview;

  const resizeCanvases = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    LAYER_NAMES.forEach((name) => {
      const canvas = canvases[name];
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
    });
    return { dpr, width, height };
  };
  const setTransform = (ctx, dpr) => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const clearCanvas = (canvas, dpr) => { const ctx = canvas.getContext('2d'); ctx.save(); setTransform(ctx, dpr); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore(); };

  // --- Subsystems (all legacy, reused untouched) ----------------------------
  const bus = createEventBus();
  const registry = createObjectRegistry();
  const history = createOverlayHistory();
  const serialization = createOverlaySerialization({ chartKey, debounceMs });
  const snapping = createOverlaySnapping(snapConfig);
  const drawingsRef = { current: [] };
  const renderList = { current: [] };
  const candlesRef = { current: [] };

  const getTransform = () => viewport.get();
  const viewport = createOverlayViewport({ tvChart, container });

  const layers = createLayerManager({ engine: null });
  layers.engine = null;

  const selection = createOverlaySelection({ bus, layers, canvas: selectionCanvas });

  const renderer = createOverlayRenderer({
    canvas: drawingsCanvas,
    getTransform,
    getDrawings: () => renderList.current,
    getSelection: () => selection,
    getHover: () => hoverManager.getHover(),
    isHidden: (id) => layers.isHidden(id),
  });

  const handles = createOverlayHandles({
    canvas: handlesCanvas,
    getTransform,
    getDrawings: () => renderList.current,
    getSelection: () => selection,
    getHover: () => hoverManager.getHover(),
    getPointEditId: () => engine.pointEditId,
  });

  // --- Engine facade (the state + invalidation hub) -------------------------
  let tool = 'cursor';
  let pointEditId = null;
  let pendingDrawing = null;
  let hover = null;
  let marquee = null;
  let selectedIds = [];
  const dirty = {};
  let raf = null;
  let destroyed = false;
  const debug = { flushes: 0, paints: 0, lastError: null, rafFired: 0 };

  const invalidate = (layer, rect = null) => {
    if (destroyed) return;
    if (layer === 'full') {
      LAYER_NAMES.forEach((name) => { dirty[name] = null; });
    } else if (layer === 'rect' && rect) {
      const current = dirty.drawings;
      dirty.drawings = current ? { x: Math.min(current.x, rect.x), y: Math.min(current.y, rect.y), width: Math.max(current.x + current.width, rect.x + rect.width) - Math.min(current.x, rect.x), height: Math.max(current.y + current.height, rect.y + rect.height) - Math.min(current.y, rect.y) } : rect;
    } else {
      dirty[layer] = null;
    }
    if (!raf) raf = requestAnimationFrame(() => { raf = null; debug.rafFired += 1; try { flush(); } catch (error) { debug.lastError = String(error?.stack || error); } });
  };

  const flush = () => {
    debug.flushes += 1;
    raf = null;
    if (destroyed) return;
    const frame = { ...dirty };
    LAYER_NAMES.forEach((name) => { delete dirty[name]; });
    const dpr = window.devicePixelRatio || 1;
    try {
    if ('drawings' in frame) {
      const ctx = drawingsCanvas.getContext('2d');
      ctx.save();
      setTransform(ctx, dpr);
      renderer.render(frame.drawings || null);
      debug.paints += 1;
      ctx.restore();
    }
    if ('selection' in frame) {
      const ctx = selectionCanvas.getContext('2d');
      ctx.save();
      setTransform(ctx, dpr);
      selection.paint(renderList.current, getTransform());
      ctx.restore();
    }
    if ('handles' in frame) {
      const ctx = handlesCanvas.getContext('2d');
      ctx.save();
      setTransform(ctx, dpr);
      handles.paint();
      ctx.restore();
    }
    if ('preview' in frame) {
      const ctx = previewCanvas.getContext('2d');
      ctx.save();
      setTransform(ctx, dpr);
      renderer.paintPending(pendingDrawing);
      ctx.restore();
    }
    } catch (error) {
      debug.lastError = String(error?.stack || error);
    }
  };

  const engine = {
    transform: getTransform,
    pipeline: {
      invalidate: (kind, rect) => {
        if (kind === 'full') invalidate('full');
        else if (kind === 'rect') invalidate('rect', rect);
      },
    },
    setDrawings(list, rect) { renderList.current = list; invalidate('drawings', rect || null); },
    setSelected(ids) { selectedIds = ids; invalidate('selection'); invalidate('handles'); },
    setMarquee(value) { marquee = value; invalidate('selection'); },
    setCrosshair() { /* the TradingView crosshair is native; nothing to paint */ },
    setPendingDrawing(drawing, rect) { pendingDrawing = drawing; invalidate('preview', rect || null); },
    setPointEdit(id) { pointEditId = id; invalidate('handles'); invalidate('selection'); },
    setHover(value) { hover = value; invalidate('drawings'); invalidate('handles'); invalidate('selection'); },
    setToolMode(next) { tool = next; },
    setSpatialQuery() { /* registry.queryRange is wired directly */ },
    resetPriceScale() { /* TradingView owns the price scale */ },
    get pointEditId() { return pointEditId; },
    destroy() { destroyed = true; },
  };

  // --- Interaction (legacy, reused untouched) -------------------------------
  const commit = (next, { rect = null } = {}) => {
    next = next.map((drawing) => (isShapeType(drawing.drawingType) ? { ...drawing, anchorPoints: normalizeShapeAnchors(drawing) } : drawing));
    drawingsRef.current = next;
    registry.setAll(next);
    selection.prune(registry.ids());
    engine.setDrawings(layers.visibleDrawings(next), rect);
    serialization.save(next);
    bus.emit('drawings:changed', next);
    onDrawingsChange?.(next);
  };

  const offSelection = bus.on('selection:changed', (ids) => {
    engine.setSelected(ids);
    onSelectionChange?.(ids);
  });
  const offMarquee = bus.on('selection:marquee', (value) => engine.setMarquee(value));

  const hitTestEngine = createOverlayHitTest({ registry, getTransform, layers });
  const hoverManager = createHoverManager({ hitTestEngine, engine, bus });
  const cursor = createOverlayCursor({ container });
  const properties = createOverlayProperties({ getInteraction: () => interaction });

  const interaction = new DrawingInteraction({
    getDrawings: () => drawingsRef.current,
    commit,
    getTransform,
    getCandles: () => candlesRef.current,
    registry, selection, layers, history, bus,
    snap: snapping.get(),
    hitTestEngine,
    getMods: () => events.mods() || {},
  });

  const toolManager = createToolManager({
    getTransform,
    getCandles: () => candlesRef.current,
    createDrawing: (options) => {
      const drawing = createDrawing({ symbol: identity.symbol, timeframe: identity.timeframe, ...options });
      if (isRegressionType(drawing.drawingType) && drawing.anchorPoints.length >= 2) {
        drawing.regression = fitLinearRegression(candlesRef.current, drawing.anchorPoints[0].time, drawing.anchorPoints[1].time);
      }
      const defaults = properties.defaultsFor(drawing.drawingType);
      if (defaults) {
        if (isPositionType(drawing.drawingType)) drawing.position = defaults;
        if (isTextType(drawing.drawingType)) drawing.text = defaults;
      }
      return drawing;
    },
  });
  toolManager.configure(snapping.get());

  const events = createOverlayEvents({
    container,
    tvChart,
    viewport,
    getTool: () => tool,
    interaction,
    getInteraction: () => interaction,
    toolManager,
    getToolManager: () => toolManager,
    selection,
    registry,
    getDrawings: () => drawingsRef.current,
    engine,
    hoverManager,
    cursor,
    layers,
    snapping,
    getCandles: () => candlesRef.current,
    onContextMenu,
    onProperties,
    activeRef,
  });

  // --- TradingView view changes (pan/zoom/timeframe/symbol) repaint ---------
  const offVisibleRange = tvChart.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (destroyed) return;
    invalidate('drawings');
    invalidate('selection');
    invalidate('handles');
  });

  // --- Resize (device pixel ratio aware) ------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    if (destroyed) return;
    resizeCanvases();
    invalidate('full');
  });
  resizeObserver.observe(container);
  resizeCanvases();
  invalidate('full');

  // --- Public API -----------------------------------------------------------
  const root = {
    chartKey,
    identity,
    bus, registry, layers, selection, history, serialization, snapping,
    viewport, renderer, handles, cursor, properties, hoverManager,
    getInteraction: () => interaction,
    getToolManager: () => toolManager,
    setCandles(candles) { candlesRef.current = candles; },
    getCandles: () => candlesRef.current,
    getDrawings: () => drawingsRef.current,
    setTool(next) { tool = next; engine.setToolMode(next); if (tool !== 'cursor') { interaction.exitPointEdit(); engine.setPointEdit(null); } invalidate('full'); cursor.clear(); },
    getTool: () => tool,
    configureSnap(next) { snapping.configure(next); toolManager.configure(snapping.get()); interaction.snap = snapping.get(); },
    setActive(value) { if (activeRef) activeRef.current = value; },
    undo() { if (history.undo()) selection.prune(registry.ids()); },
    redo() { if (history.redo()) selection.prune(registry.ids()); },
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    clearAll() { interaction.clearAll(); },
    deleteSelected() { interaction.delete(); },
    duplicate() { interaction.duplicate(); },
    invalidate() { invalidate('full'); },
    get debug() { return debug; },
    getPendingDrawing: () => pendingDrawing,
    getPointEditId: () => pointEditId,
    setPointEdit(id) { engine.setPointEdit(id); },
    flush() { serialization.flush(drawingsRef.current); },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      offVisibleRange?.();
      offSelection();
      offMarquee();
      resizeObserver.disconnect();
      events.destroy();
      serialization.flush(drawingsRef.current);
      LAYER_NAMES.forEach((name) => { try { canvases[name].remove(); } catch { /* already gone */ } });
    },
  };

  onReady?.(root);
  return root;
}
