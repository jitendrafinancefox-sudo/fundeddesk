'use client';
import { useEffect, useRef, useState } from 'react';
import { normalizeCandles } from '@/services/candleAggregator';
import { marketData } from '@/services/marketData';
import { CanvasChartEngine } from './engine/CanvasChartEngine';
import { InteractionController } from './engine/InteractionController';
import { DrawingInteraction } from './engine/DrawingInteraction';
import { buildIndicators } from './IndicatorEngine';
import { createDrawing } from './engine/DrawingSchema';
import { createEventBus } from './drawing/EventBus';
import { createObjectRegistry } from './drawing/ObjectRegistry';
import { createSelectionManager } from './drawing/SelectionManager';
import { createLayerManager } from './drawing/LayerManager';
import { createToolManager } from './drawing/ToolManager';
import { createSerializationManager } from './drawing/SerializationManager';
import { createHistoryManager } from './HistoryManager';
import { createHitTestEngine } from './interaction/HitTestEngine';
import { createHoverManager } from './interaction/HoverManager';
import { createCursorManager } from './interaction/CursorManager';
import { createKeyboardShortcutManager } from './interaction/KeyboardShortcutManager';
import { isShapeType, isZoneType, isChannelType, normalizeShapeAnchors } from './drawing/DrawingDefinitions';
import { isRegressionType, fitLinearRegression } from './drawing/ChannelGeometry';
import ChartContextMenu from './ui/ChartContextMenu';
import PropertiesPanel from './ui/PropertiesPanel';

// Provider-neutral chart surface. The only market-data dependency is the caller
// supplied candle source; this component can therefore be reused with replay,
// cached, WebSocket, or Angel relay data without changing the engine.
const PRICE_AXIS_W = 64; // matches AxisRenderer's right-side label margin
const TIME_AXIS_H = 24;  // matches TimeAxisRenderer's bottom label margin

export default function ChartCanvas({ exchange, token, interval, symbol = String(token || 'unknown'), timeframe = interval, height = 440, className, onPrice, tool = 'cursor', chartKey = 'default', drawingsVisible = true, clearRevision = 0, activeIndicators = [], snap: snapConfig = { magnet: true, mode: 'ohlc' } }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const interactionRef = useRef(null);
  const drawingInteractionRef = useRef(null);
  const toolManagerRef = useRef(null);
  const layersRef = useRef(null);
  const selectionRef = useRef(null);
  const drawingsRef = useRef([]);
  const candlesRef = useRef([]);
  const activeIndicatorsRef = useRef(activeIndicators);
  const drawingsVisibleRef = useRef(drawingsVisible);
  const dragRef = useRef(null);
  const hoverManagerRef = useRef(null);
  const cursorManagerRef = useRef(null);
  const keyboardRef = useRef(null);
  const [axisHover, setAxisHover] = useState(null); // 'price' | 'time' | null — drives the cursor style
  const [contextMenu, setContextMenu] = useState(null); // { x, y, id, bounds }
  const [properties, setProperties] = useState(null);  // { id } — double-click properties panel

  // Mount: build the whole drawing subsystem (bus → registry → selection →
  // layers → history → serialization → tool manager) and wire the engine.
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const engine = new CanvasChartEngine(canvas, chartKey); engineRef.current = engine;
    const bus = createEventBus();
    const registry = createObjectRegistry();
    const layers = createLayerManager({ engine });
    const selection = createSelectionManager({ bus, layers });
    const history = createHistoryManager();
    const serialization = createSerializationManager({ chartKey });
    selectionRef.current = selection; layersRef.current = layers;

    // Single mutation funnel: every change flows through here so the registry,
    // engine, React state and persistence stay in lockstep. Shape diagonals
    // are promoted to full corner anchors here, covering placement, paste,
    // undo re-application and serialization loads alike. A screen-space rect
    // triggers a partial (dirty-rect) redraw instead of a full frame.
    const commit = (next, { rect = null } = {}) => {
      next = next.map((drawing) => (isShapeType(drawing.drawingType) ? { ...drawing, anchorPoints: normalizeShapeAnchors(drawing) } : drawing));
      drawingsRef.current = next;
      registry.setAll(next);
      selection.prune(registry.ids());
      engine.setDrawings(drawingsVisibleRef.current ? layers.visibleDrawings(next) : [], rect);
      serialization.save(next);
    };

    const offSelection = bus.on('selection:changed', (ids) => engine.setSelected(ids));
    const offMarquee = bus.on('selection:marquee', (rect) => engine.setMarquee(rect));
    engine.setSpatialQuery((from, to) => registry.queryRange(from, to));

    const hitTestEngine = createHitTestEngine({ registry, getTransform: () => engine.transform(), layers });
    const hoverManager = createHoverManager({ hitTestEngine, engine, bus });
    const cursorManager = createCursorManager({ canvas });
    const keyboard = createKeyboardShortcutManager({
      getInteraction: () => drawingInteractionRef.current,
      getToolManager: () => toolManagerRef.current,
      selection, engine,
    });
    hoverManagerRef.current = hoverManager; cursorManagerRef.current = cursorManager; keyboardRef.current = keyboard;

    interactionRef.current = new InteractionController(engine);
    drawingInteractionRef.current = new DrawingInteraction({
      getDrawings: () => drawingsRef.current,
      commit,
      getTransform: () => engine.transform(),
      getCandles: () => candlesRef.current,
      registry, selection, layers, history, bus,
      snap: { magnet: true, mode: 'ohlc' },
      hitTestEngine,
      getMods: () => keyboardRef.current?.mods() || {},
    });
    toolManagerRef.current = createToolManager({
      getTransform: () => engine.transform(),
      getCandles: () => candlesRef.current,
      createDrawing: (options) => {
        const drawing = createDrawing({ symbol, timeframe, ...options });
        if (isRegressionType(drawing.drawingType) && drawing.anchorPoints.length >= 2) {
          drawing.regression = fitLinearRegression(candlesRef.current, drawing.anchorPoints[0].time, drawing.anchorPoints[1].time);
        }
        return drawing;
      },
    });
    toolManagerRef.current.configure({ magnet: true, mode: 'ohlc' });

    commit(serialization.load());

    const resize = () => engine.resize(canvas.parentElement?.clientWidth || 1, height);
    const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement); resize();
    return () => {
      observer.disconnect();
      offSelection(); offMarquee();
      serialization.flush(drawingsRef.current);
      keyboard?.destroy(); keyboardRef.current = null;
      hoverManagerRef.current = null; cursorManagerRef.current = null;
      interactionRef.current?.destroy(); interactionRef.current = null;
      drawingInteractionRef.current = null; toolManagerRef.current = null;
      selectionRef.current = null; layersRef.current = null;
      engine.destroy(); engineRef.current = null;
    };
  }, [chartKey, height, symbol, timeframe]);

  useEffect(() => {
    if (!exchange || !token || !interval) return;
    const controller = new AbortController();
    marketData.history(exchange, token, interval, controller.signal).then((rows) => { const candles = normalizeCandles(rows); const engine = engineRef.current; engine?.setCandles(candles); candlesRef.current = candles; engine?.setIndicators(buildIndicators(candles, activeIndicatorsRef.current)); const last = candles[candles.length - 1]; if (last) onPrice?.(last.close); }).catch(() => engineRef.current?.setCandles([]));
    return () => controller.abort();
  }, [exchange, token, interval, onPrice]);
  useEffect(() => { activeIndicatorsRef.current = activeIndicators; engineRef.current?.setIndicators(buildIndicators(candlesRef.current, activeIndicators)); }, [activeIndicators]);
  useEffect(() => { drawingsVisibleRef.current = drawingsVisible; engineRef.current?.setDrawings(drawingsVisible ? drawingsRef.current : []); }, [drawingsVisible, chartKey]);
  useEffect(() => { if (clearRevision) drawingInteractionRef.current?.clearAll(); }, [clearRevision, chartKey]);
  useEffect(() => { engineRef.current?.setToolMode(tool); }, [tool, chartKey]);
  useEffect(() => { applyCursor(); }, [tool, axisHover]);
  useEffect(() => {
    toolManagerRef.current?.configure(snapConfig);
    if (drawingInteractionRef.current) drawingInteractionRef.current.snap = snapConfig;
  }, [snapConfig]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setContextMenu(null); setProperties(null); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  function point(event) { const box = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top }; }
  function applyCursor() { cursorManagerRef.current?.apply({ tool, hover: hoverManagerRef.current?.getHover() || null, panning: Boolean(dragRef.current), axisHover }); }
  const propertiesDrawing = properties ? drawingsRef.current.find((drawing) => drawing.id === properties.id) || null : null;
  const menuDrawing = contextMenu?.id ? drawingsRef.current.find((drawing) => drawing.id === contextMenu.id) || null : null;
  const runMenuAction = (action) => {
    const interaction = drawingInteractionRef.current;
    const id = contextMenu?.id || null;
    if (action === 'properties' && id) setProperties({ id });
    else if (action === 'duplicate') interaction?.duplicate();
    else if (action === 'copy') interaction?.copy();
    else if (action === 'paste') interaction?.paste();
    else if (action === 'delete') interaction?.delete();
    else if (action === 'lock' && id) (menuDrawing?.locked ? interaction?.unlock([id]) : interaction?.lock([id]));
    else if (action === 'hide' && id) interaction?.hide([id]);
    else if (action === 'front' && id) interaction?.zMove(id, 'front');
    else if (action === 'back' && id) interaction?.zMove(id, 'back');
    else if (action === 'clear') interaction?.clearAll();
    else if (action.startsWith('zone') && id) {
      const key = action === 'zoneExtendLeft' ? 'extendLeft' : action === 'zoneExtendRight' ? 'extendRight' : action === 'zoneShowLabel' ? 'showLabel' : 'showPrice';
      const current = menuDrawing?.style?.[key];
      interaction?.updateStyle(id, { [key]: current === false });
    }
    else if (action === 'channelDash' && id) interaction?.updateStyle(id, { dash: !menuDrawing?.style?.dash });
    else if (action === 'channelArrow' && id) interaction?.updateStyle(id, { arrow: !menuDrawing?.style?.arrow });
  };
  const axisDragRef = useRef(null);
  function zoneAt(p) {
    const cv = canvasRef.current; if (!cv) return null;
    if (p.x > cv.clientWidth - PRICE_AXIS_W) return 'price';
    if (p.y > (cv.clientHeight || height) - TIME_AXIS_H) return 'time';
    return null;
  }
  return <div style={{ position: 'relative', width: '100%', height }}>
    <canvas
    ref={canvasRef}
    className={className}
    onPointerDown={(event) => {
      setContextMenu(null);
      const p = point(event);
      const zone = zoneAt(p);
      if (zone === 'price') { axisDragRef.current = { type: 'price', lastY: p.y }; applyCursor(); return; }
      if (zone === 'time') { axisDragRef.current = { type: 'time', lastX: p.x, anchorX: p.x }; applyCursor(); return; }
      if (tool === 'cursor') {
        const editing = drawingInteractionRef.current?.pointerDown(p, { additive: keyboardRef.current?.mods().shift });
        if (!editing) { dragRef.current = p; interactionRef.current?.startPan(p); }
        applyCursor();
        return;
      }
      // Tool placement: the first press begins the drawing; later presses
      // commit channel width / extra anchors and can complete the placement.
      const active = toolManagerRef.current?.isActive();
      const result = active ? toolManagerRef.current?.click(p) : toolManagerRef.current?.begin(tool, p);
      if (result) { engineRef.current?.setPendingDrawing(null); drawingInteractionRef.current?.place(result); }
      else engineRef.current?.setPendingDrawing(toolManagerRef.current?.pendingDrawing() || null);
      applyCursor();
    }}
    onPointerMove={(event) => {
      const p = point(event);
      const engine = engineRef.current; if (!engine) return;
      if (axisDragRef.current?.type === 'price') { engine.dragPriceScale(p.y - axisDragRef.current.lastY); axisDragRef.current.lastY = p.y; hoverManagerRef.current?.clear(); applyCursor(); return; }
      if (axisDragRef.current?.type === 'time') { engine.dragBarWidth(p.x - axisDragRef.current.lastX, axisDragRef.current.anchorX); axisDragRef.current.lastX = p.x; hoverManagerRef.current?.clear(); applyCursor(); return; }
      if (dragRef.current) { interactionRef.current?.movePan(p); hoverManagerRef.current?.clear(); applyCursor(); return; }
      if (toolManagerRef.current?.isActive()) {
        const prev = toolManagerRef.current.pendingDrawing();
        const next = toolManagerRef.current.update(p);
        const rect = prev && next && !isZoneType(prev.drawingType) && !isChannelType(prev.drawingType) ? layersRef.current?.dirtyRect(prev, next, engine.transform()) : null;
        engine.setPendingDrawing(next, rect || null);
        hoverManagerRef.current?.clear();
        applyCursor();
        return;
      }
      const interaction = drawingInteractionRef.current;
      if (interaction?.mode || interaction?.marqueeActive) { hoverManagerRef.current?.clear(); interaction.pointerMove(p); applyCursor(); return; }
      hoverManagerRef.current?.update(p);
      engine.setCrosshair(p); setAxisHover(zoneAt(p));
      applyCursor();
    }}
    onPointerUp={(event) => {
      if (axisDragRef.current) { axisDragRef.current = null; applyCursor(); return; }
      if (dragRef.current) { dragRef.current = null; interactionRef.current?.endPan(); applyCursor(); return; }
      if (toolManagerRef.current?.isActive()) {
        const final = toolManagerRef.current.release();
        const pending = toolManagerRef.current.pendingDrawing();
        engineRef.current?.setPendingDrawing(pending || null);
        if (final) drawingInteractionRef.current?.place(final);
        applyCursor();
        return;
      }
      drawingInteractionRef.current?.pointerUp();
      applyCursor();
    }}
    onPointerLeave={() => { axisDragRef.current = null; setAxisHover(null); dragRef.current = null; toolManagerRef.current?.cancel(); engineRef.current?.setPendingDrawing(null); drawingInteractionRef.current?.pointerUp(); interactionRef.current?.endPan(); engineRef.current?.setCrosshair(null); hoverManagerRef.current?.clear(); applyCursor(); }}
    onDoubleClick={(event) => {
      const p = point(event);
      if (zoneAt(p) === 'price') { engineRef.current?.resetPriceScale(); return; }
      if (tool !== 'cursor') return;
      const hit = drawingInteractionRef.current?.hitLoose(p);
      if (hit) { selectionRef.current?.select(hit.id); setProperties({ id: hit.id }); }
    }}
    onContextMenu={(event) => {
      event.preventDefault();
      const p = point(event);
      if (toolManagerRef.current?.isActive()) { toolManagerRef.current.cancel(); engineRef.current?.setPendingDrawing(null); }
      const hit = tool === 'cursor' ? drawingInteractionRef.current?.hitLoose(p) : null;
      if (hit) selectionRef.current?.select(hit.id);
      const cv = canvasRef.current;
      setContextMenu({ x: p.x, y: p.y, id: hit?.id || null, bounds: cv ? { width: cv.clientWidth, height: cv.clientHeight } : null });
    }}
    onWheel={(event) => { event.preventDefault(); interactionRef.current?.zoom(event.deltaY, point(event).x); }}
    style={{ display: 'block', width: '100%', height, touchAction: 'none' }}
  />
    {contextMenu && <ChartContextMenu x={contextMenu.x} y={contextMenu.y} id={contextMenu.id} locked={menuDrawing?.locked} hidden={menuDrawing?.hidden} zone={menuDrawing && isZoneType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, showLabel: menuDrawing.style?.showLabel !== false, showPrice: menuDrawing.style?.showPrice !== false } : null} channel={menuDrawing && isChannelType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, dash: Boolean(menuDrawing.style?.dash), arrow: Boolean(menuDrawing.style?.arrow) } : null} hasClipboard={Boolean(drawingInteractionRef.current?.clipboard?.length)} bounds={contextMenu.bounds} onAction={runMenuAction} onClose={() => setContextMenu(null)} />}
    {propertiesDrawing && <PropertiesPanel drawing={propertiesDrawing} onStyle={(patch) => drawingInteractionRef.current?.updateStyle(propertiesDrawing.id, patch)} onLockToggle={(locked) => (locked ? drawingInteractionRef.current?.lock([propertiesDrawing.id]) : drawingInteractionRef.current?.unlock([propertiesDrawing.id]))} onClose={() => setProperties(null)} />}
  </div>;
}
