'use client';
import { useEffect, useRef, useState } from 'react';
import { normalizeCandles } from '@/services/candleAggregator';
import { marketData } from '@/services/marketData';
import { CanvasChartEngine } from './engine/CanvasChartEngine';
import { InteractionController } from './engine/InteractionController';
import { DrawingInteraction } from './engine/DrawingInteraction';
import { buildIndicators, getIndicator } from './IndicatorEngine';
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
import { isShapeType, isZoneType, isChannelType, isStrokeType, isPositionType, isTextType, normalizeShapeAnchors } from './drawing/DrawingDefinitions';
import { textDefaults } from './drawing/TextGeometry';
import { isRegressionType, fitLinearRegression } from './drawing/ChannelGeometry';
import ChartContextMenu from './ui/ChartContextMenu';
import PropertiesPanel from './ui/PropertiesPanel';
import DrawingFlyout from './ui/DrawingFlyout';
import { PRICE_AXIS_W, TIME_AXIS_H } from './engine/coords/AxisConstants';

// Provider-neutral chart surface. The only market-data dependency is the caller
// supplied candle source; this component can therefore be reused with replay,
// cached, WebSocket, or Angel relay data without changing the engine.

export default function ChartCanvas({ exchange, token, interval, symbol = String(token || 'unknown'), timeframe = interval, height = 440, className, onPrice, onCandle, onCrosshair, tool = 'cursor', chartKey = 'default', drawingsVisible = true, clearRevision = 0, activeIndicators = [], snap: snapConfig = { magnet: true, mode: 'ohlc' }, managerRef = null, activeRef = null, onIndicators = null }) {
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
  const [flyout, setFlyout] = useState(null); // { x, y, id } — floating toolbar above selected drawing

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
      bus.emit('drawings:changed', next);
    };

    const offSelection = bus.on('selection:changed', (ids) => {
      engine.setSelected(ids);
      // Show flyout above the selected drawing
      if (ids.length === 1) {
        const drawing = drawingsRef.current.find(d => d.id === ids[0]);
        if (drawing && !isZoneType(drawing.drawingType) && !isStrokeType(drawing.drawingType) && !isTextType(drawing.drawingType) && !isPositionType(drawing.drawingType)) {
          const transform = engine.transform();
          const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
          if (points.length >= 2) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
            const minY = Math.min(...ys);
            setFlyout({ x: centerX, y: minY - 8, id: ids[0] });
          } else {
            setFlyout(null);
          }
        } else {
          setFlyout(null);
        }
      } else {
        setFlyout(null);
      }
    });
    const offMarquee = bus.on('selection:marquee', (rect) => engine.setMarquee(rect));
    engine.setSpatialQuery((from, to) => registry.queryRange(from, to));

    const hitTestEngine = createHitTestEngine({ registry, getTransform: () => engine.transform(), layers });
    const hoverManager = createHoverManager({ hitTestEngine, engine, bus });
    const cursorManager = createCursorManager({ canvas });
    const keyboard = createKeyboardShortcutManager({
      getInteraction: () => drawingInteractionRef.current,
      getToolManager: () => toolManagerRef.current,
      selection, engine,
      // With multiple panes mounted each chart binds window keydown; only the
      // ACTIVE pane's drawings may react to Delete/Ctrl+C/V/Z/Escape.
      active: () => activeRef?.current !== false,
    });
    hoverManagerRef.current = hoverManager; cursorManagerRef.current = cursorManager; keyboardRef.current = keyboard;

    interactionRef.current = new InteractionController(engine);
    drawingInteractionRef.current = new DrawingInteraction({
      getDrawings: () => drawingsRef.current,
      commit,
      getTransform: () => engine.transform(),
      getCandles: () => candlesRef.current,
      registry, selection, layers, history, bus,
      snap: { magnet: false, mode: 'ohlc' },
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
        if (isPositionType(drawing.drawingType)) {
          drawing.position = { lots: 1, account: 0, currency: 'INR', pipSize: 0.01 };
        }
        if (isTextType(drawing.drawingType)) {
          drawing.text = textDefaults(drawing.drawingType);
        }
        return drawing;
      },
    });
    toolManagerRef.current.configure({ magnet: true, mode: 'ohlc' });
    if (managerRef) {
      managerRef.current = {
        getDrawings: () => drawingsRef.current,
        getSelection: () => selectionRef.current,
        getInteraction: () => drawingInteractionRef.current,
        getLayers: () => layersRef.current,
        getRegistry: () => registry,
        getEngine: () => engine,
        getBus: () => bus,
        getIdentity: () => ({ symbol, timeframe }),
        chartKey,
      };
    }

    commit(serialization.load());

    const resize = () => { const parent = canvas.parentElement; engine.resize(parent?.clientWidth || 1, parent?.clientHeight || 1); };
    const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement); resize();
    // Moving between displays changes the device pixel ratio; resize the
    // backing store (crisp at the new DPR) instead of staying blurry.
    let dprQuery = null;
    let offDpr = null;
    if (typeof window.matchMedia === 'function') {
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      offDpr = () => dprQuery.addEventListener('change', resize);
      offDpr();
    }
    return () => {
      observer.disconnect();
      dprQuery?.removeEventListener('change', resize);
      offSelection(); offMarquee();
      serialization.flush(drawingsRef.current);
      keyboard?.destroy(); keyboardRef.current = null;
      hoverManagerRef.current = null; cursorManagerRef.current = null;
      interactionRef.current?.destroy(); interactionRef.current = null;
      drawingInteractionRef.current = null; toolManagerRef.current = null;
      if (managerRef) managerRef.current = null;
      selectionRef.current = null; layersRef.current = null;
      engine.destroy(); engineRef.current = null;
    };
  }, [chartKey, symbol, timeframe]);

  useEffect(() => {
    if (!exchange || !token || !interval) return;
    const controller = new AbortController();
    marketData.history(exchange, token, interval, controller.signal).then((rows) => { const candles = normalizeCandles(rows); const engine = engineRef.current; engine?.setCandles(candles); candlesRef.current = candles; engine?.setIndicators(buildIndicators(candles, activeIndicatorsRef.current)); emitIndicators(candles); const last = candles[candles.length - 1]; if (last) { onPrice?.(last.close); onCandle?.({ open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume, time: last.time, prevClose: candles.length > 1 ? candles[candles.length - 2].close : last.open }); } }).catch(() => engineRef.current?.setCandles([]));
    return () => controller.abort();
  }, [exchange, token, interval, onPrice]);
  useEffect(() => { activeIndicatorsRef.current = activeIndicators; engineRef.current?.setIndicators(buildIndicators(candlesRef.current, activeIndicators)); emitIndicators(candlesRef.current); }, [activeIndicators]);
  useEffect(() => { drawingsVisibleRef.current = drawingsVisible; engineRef.current?.setDrawings(drawingsVisible ? drawingsRef.current : []); }, [drawingsVisible, chartKey]);
  useEffect(() => { if (clearRevision) drawingInteractionRef.current?.clearAll(); }, [clearRevision, chartKey]);
  useEffect(() => { engineRef.current?.setToolMode(tool); if (tool !== 'cursor') { drawingInteractionRef.current?.exitPointEdit(); engineRef.current?.setPointEdit(null); } }, [tool, chartKey]);
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
  // Native wheel listener with { passive: false } to prevent page scroll and
  // browser zoom (Ctrl/Cmd + wheel, trackpad pinch) while the cursor is over
  // the chart. Keyboard zoom shortcuts (Ctrl/Cmd + + / - / 0) are intercepted
  // while the chart container has focus.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = () => canvas.getBoundingClientRect();
    const onWheel = (e) => {
      e.preventDefault();
      interactionRef.current?.zoom(e.deltaY, e.clientX - box().left);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    const wrapper = canvas.parentElement;
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (['+', '=', '-', '_', '0'].includes(key)) e.preventDefault();
    };
    wrapper?.addEventListener('keydown', onKeyDown);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      wrapper?.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  function point(event) { const box = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top }; }
  function applyCursor() { cursorManagerRef.current?.apply({ tool, hover: hoverManagerRef.current?.getHover() || null, panning: Boolean(dragRef.current), axisHover }); }
  // Legend feed: last value of every active indicator series, emitted only
  // when candles or the indicator set change (never per tick).
  function emitIndicators(candles) {
    if (!onIndicators || !candles?.length || !activeIndicatorsRef.current.length) return;
    const summary = [];
    for (const id of activeIndicatorsRef.current) {
      const indicator = getIndicator(id);
      if (!indicator) continue;
      try {
        for (const series of indicator.build(candles)) {
          const last = series.points[series.points.length - 1];
          if (last == null) continue;
          summary.push({ id, label: indicator.label, color: series.color || '#4d7cfe', value: typeof last === 'object' ? (last.close ?? last.value ?? null) : last });
        }
      } catch { /* indicator failed to build — skip */ }
    }
    onIndicators(summary);
  }
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
    else if (action === 'forward' && id) interaction?.zMove(id, 'forward');
    else if (action === 'backward' && id) interaction?.zMove(id, 'backward');
    else if (action === 'clear') interaction?.clearAll();
    else if (action.startsWith('zone') && id) {
      const key = action === 'zoneExtendLeft' ? 'extendLeft' : action === 'zoneExtendRight' ? 'extendRight' : action === 'zoneShowLabel' ? 'showLabel' : 'showPrice';
      const current = menuDrawing?.style?.[key];
      interaction?.updateStyle(id, { [key]: current === false });
    }
    else if (action === 'channelDash' && id) interaction?.updateStyle(id, { dash: !menuDrawing?.style?.dash });
    else if (action === 'channelArrow' && id) interaction?.updateStyle(id, { arrow: !menuDrawing?.style?.arrow });
    else if (action === 'positionFlip' && id) interaction?.flipPosition(id);
    else if (action === 'positionShowLabels' && id) interaction?.updateStyle(id, { showLabels: menuDrawing?.style?.showLabels === false });
    else if (action === 'positionShowRR' && id) interaction?.updateStyle(id, { showRR: menuDrawing?.style?.showRR === false });
    else if (action === 'textAutoSizeReset' && id) interaction?.updateText(id, { autoSize: true });
    else if (action === 'textToggleSnap' && id) interaction?.updateText(id, { snapToCandle: menuDrawing?.text?.snapToCandle === false });
    else if (action === 'editPoints' && id) { const next = interaction?.togglePointEdit(id); engineRef.current?.setPointEdit(next); }
    else if (action === 'pointInsert' && id) interaction?.insertAnchorAt(id, contextMenu.x, contextMenu.y);
    else if (action === 'pointDelete' && id) interaction?.deleteAnchorAt(id, contextMenu.x, contextMenu.y);
    else if (action === 'pointSmooth' && id) interaction?.convertAnchorAt(id, contextMenu.x, contextMenu.y, true);
    else if (action === 'pointSharp' && id) interaction?.convertAnchorAt(id, contextMenu.x, contextMenu.y, false);
  };
  const axisDragRef = useRef(null);
  const lastCrosshairTimeRef = useRef(undefined);
  function zoneAt(p) {
    const cv = canvasRef.current; if (!cv) return null;
    if (p.x > cv.clientWidth - PRICE_AXIS_W) return 'price';
    if (p.y > cv.clientHeight - TIME_AXIS_H) return 'time';
    return null;
  }
  return <div style={{ position: 'relative', width: '100%', height: '100%', outline: 'none' }} tabIndex={-1} onPointerDown={(event) => { if (event.target === canvasRef.current) event.currentTarget.focus({ preventScroll: true }); }}>
    <canvas
    ref={canvasRef}
    className={className}
    onPointerDown={(event) => {
      setContextMenu(null);
      const p = point(event);
      const zone = zoneAt(p);
      if (zone === 'price') { axisDragRef.current = { type: 'price', lastY: p.y }; applyCursor(); return; }
      if (zone === 'time') { axisDragRef.current = { type: 'time', lastX: p.x, anchorX: p.x }; applyCursor(); return; }
      // Middle mouse button = always pan (TradingView convention)
      if (event.button === 1) {
        event.preventDefault();
        dragRef.current = p;
        interactionRef.current?.startPan(p);
        applyCursor();
        return;
      }
      if (tool === 'cursor') {
        const interaction = drawingInteractionRef.current;
        const wasEditing = Boolean(interaction?.pointEditingId());
        const editing = interaction?.pointerDown(p, { additive: keyboardRef.current?.mods().shift });
        if (!editing) {
          if (wasEditing && !interaction.pointEditingId()) engineRef.current?.setPointEdit(null);
          // Only start pan on left mouse button
          if (event.button === 0) { dragRef.current = p; interactionRef.current?.startPan(p); }
        }
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
        const rect = prev && next && !isZoneType(prev.drawingType) && !isChannelType(prev.drawingType) && !isPositionType(prev.drawingType) && !isTextType(prev.drawingType) ? layersRef.current?.dirtyRect(prev, next, engine.transform()) : null;
        engine.setPendingDrawing(next, rect || null);
        hoverManagerRef.current?.clear();
        applyCursor();
        return;
      }
      const interaction = drawingInteractionRef.current;
      if (interaction?.mode || interaction?.marqueeActive) { hoverManagerRef.current?.clear(); interaction.pointerMove(p); applyCursor(); return; }
      hoverManagerRef.current?.update(p);
      engine.setCrosshair(p);
      // Emit to React only when the hovered candle changes, so the OHLCV bar
      // stays fresh without re-rendering the pane on every mouse pixel.
      const ch = engine.scene.crosshair;
      if (ch && ch.time !== lastCrosshairTimeRef.current) {
        lastCrosshairTimeRef.current = ch.time;
        onCrosshair?.(ch);
      } else if (!ch && lastCrosshairTimeRef.current !== undefined) {
        lastCrosshairTimeRef.current = undefined;
        onCrosshair?.(null);
      }
      setAxisHover(zoneAt(p));
      applyCursor();
    }}
    onPointerUp={(event) => {
      if (axisDragRef.current) { axisDragRef.current = null; applyCursor(); return; }
      if (dragRef.current) { dragRef.current = null; interactionRef.current?.endPan(); applyCursor(); return; }
      if (toolManagerRef.current?.isActive()) {
        const final = toolManagerRef.current.release();
        const pending = toolManagerRef.current.pendingDrawing();
        engineRef.current?.setPendingDrawing(pending || null);
        if (final) {
          if (tool === 'eraser') drawingInteractionRef.current?.erase(final);
          else drawingInteractionRef.current?.place(final);
        }
        applyCursor();
        return;
      }
      drawingInteractionRef.current?.pointerUp();
      applyCursor();
    }}
    onPointerLeave={() => { axisDragRef.current = null; setAxisHover(null); dragRef.current = null; toolManagerRef.current?.cancel(); engineRef.current?.setPendingDrawing(null); drawingInteractionRef.current?.pointerUp(); interactionRef.current?.endPan(); engineRef.current?.setCrosshair(null); lastCrosshairTimeRef.current = undefined; onCrosshair?.(null); hoverManagerRef.current?.clear(); applyCursor(); }}
    onDoubleClick={(event) => {
      const p = point(event);
      if (zoneAt(p) === 'price') { engineRef.current?.resetPriceScale(); return; }
      // Open-ended tools (path/polyline) finish on double-click.
      if (toolManagerRef.current?.isActive()) {
        const final = toolManagerRef.current.finish();
        engineRef.current?.setPendingDrawing(null);
        if (final) drawingInteractionRef.current?.place(final);
        return;
      }
      if (tool !== 'cursor') return;
      const hit = drawingInteractionRef.current?.hitLoose(p);
      if (hit) {
        selectionRef.current?.select(hit.id);
        if (isStrokeType(hit.drawingType)) {
          const next = drawingInteractionRef.current?.togglePointEdit(hit.id);
          engineRef.current?.setPointEdit(next);
        } else {
          setProperties({ id: hit.id });
        }
      }
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
    style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
  />
    {contextMenu && <ChartContextMenu x={contextMenu.x} y={contextMenu.y} id={contextMenu.id} locked={menuDrawing?.locked} hidden={menuDrawing?.hidden} zone={menuDrawing && isZoneType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, showLabel: menuDrawing.style?.showLabel !== false, showPrice: menuDrawing.style?.showPrice !== false } : null} channel={menuDrawing && isChannelType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, dash: Boolean(menuDrawing.style?.dash), arrow: Boolean(menuDrawing.style?.arrow) } : null} stroke={menuDrawing && isStrokeType(menuDrawing.drawingType) ? { editing: drawingInteractionRef.current?.pointEditingId() === menuDrawing.id, points: menuDrawing.anchorPoints.length } : null} position={menuDrawing && isPositionType(menuDrawing.drawingType) ? { showLabels: menuDrawing.style?.showLabels !== false, showRR: menuDrawing.style?.showRR !== false } : null} text={menuDrawing && isTextType(menuDrawing.drawingType) ? { autoSize: menuDrawing.text?.autoSize !== false, snapToCandle: menuDrawing.text?.snapToCandle !== false } : null} hasClipboard={Boolean(drawingInteractionRef.current?.clipboard?.length)} bounds={contextMenu.bounds} onAction={runMenuAction} onClose={() => setContextMenu(null)} />}
    {flyout && (() => {
      const drawing = drawingsRef.current.find(d => d.id === flyout.id);
      if (!drawing) return null;
      return <DrawingFlyout
        drawing={drawing}
        position={flyout}
        onStyle={(patch) => drawingInteractionRef.current?.updateStyle(flyout.id, patch)}
        onDelete={() => { drawingInteractionRef.current?.delete(); setFlyout(null); }}
        onClose={() => setFlyout(null)}
      />;
    })()}
    {propertiesDrawing && <PropertiesPanel drawing={propertiesDrawing} onStyle={(patch) => drawingInteractionRef.current?.updateStyle(propertiesDrawing.id, patch)} onFib={(patch) => drawingInteractionRef.current?.updateFib(propertiesDrawing.id, patch)} onPosition={(patch) => drawingInteractionRef.current?.updatePosition(propertiesDrawing.id, patch)} onText={(patch) => drawingInteractionRef.current?.updateText(propertiesDrawing.id, patch)} onTextLive={(patch) => drawingInteractionRef.current?.updateTextLive(propertiesDrawing.id, patch)} onFlip={() => drawingInteractionRef.current?.flipPosition(propertiesDrawing.id)} onLockToggle={(locked) => (locked ? drawingInteractionRef.current?.lock([propertiesDrawing.id]) : drawingInteractionRef.current?.unlock([propertiesDrawing.id]))} onPointEdit={(id) => { const next = drawingInteractionRef.current?.togglePointEdit(id); engineRef.current?.setPointEdit(next); }} onClose={() => setProperties(null)} />}
  </div>;
}
