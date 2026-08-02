'use client';
import { useEffect, useRef, useState } from 'react';
import { normalizeCandles } from '@/services/candleAggregator';
import { marketData } from '@/services/marketData';
import { drawingPersistence } from '@/services/drawingPersistence';
import { CanvasChartEngine } from './engine/CanvasChartEngine';
import { createDrawingEngine } from './DrawingEngine';
import { InteractionController } from './engine/InteractionController';
import { buildIndicators } from './IndicatorEngine';
import { DrawingInteraction } from './engine/DrawingInteraction';

// Provider-neutral chart surface. The only market-data dependency is the caller
// supplied candle source; this component can therefore be reused with replay,
// cached, WebSocket, or Angel relay data without changing the engine.
const PRICE_AXIS_W = 64; // matches AxisRenderer's right-side label margin
const TIME_AXIS_H = 24;  // matches TimeAxisRenderer's bottom label margin

export default function ChartCanvas({ exchange, token, interval, symbol = String(token || 'unknown'), timeframe = interval, height = 440, className, onPrice, tool = 'cursor', chartKey = 'default', drawingsVisible = true, clearRevision = 0, activeIndicators = [] }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const interactionRef = useRef(null);
  const drawingEngineRef = useRef(null);
  const drawingInteractionRef = useRef(null);
  const drawingsRef = useRef([]);
  const candlesRef = useRef([]);
  const activeIndicatorsRef = useRef(activeIndicators);
  const dragRef = useRef(null);
  const [drawings, setDrawings] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const engine = new CanvasChartEngine(canvas, chartKey); engineRef.current = engine; interactionRef.current = new InteractionController(engine); drawingInteractionRef.current = new DrawingInteraction({ getDrawings: () => drawingsRef.current, setDrawings, getTransform: () => engine.transform() });
    const resize = () => engine.resize(canvas.parentElement?.clientWidth || 1, height);
    const observer = new ResizeObserver(resize); observer.observe(canvas.parentElement); resize();
    return () => { observer.disconnect(); interactionRef.current?.destroy(); interactionRef.current = null; engine.destroy(); engineRef.current = null; };
  }, [chartKey, height]);
  useEffect(() => {
    if (!exchange || !token || !interval) return;
    const controller = new AbortController();
    marketData.history(exchange, token, interval, controller.signal).then((rows) => { const candles = normalizeCandles(rows); const engine = engineRef.current; engine?.setCandles(candles); candlesRef.current = candles; engine?.setIndicators(buildIndicators(candles, activeIndicatorsRef.current)); const last = candles[candles.length - 1]; if (last) onPrice?.(last.close); }).catch(() => engineRef.current?.setCandles([]));
    return () => controller.abort();
  }, [exchange, token, interval, onPrice]);
  useEffect(() => { activeIndicatorsRef.current = activeIndicators; engineRef.current?.setIndicators(buildIndicators(candlesRef.current, activeIndicators)); }, [activeIndicators]);
  useEffect(() => { setDrawings(drawingPersistence.load(chartKey)); }, [chartKey]);
  useEffect(() => { if (clearRevision) { setDrawings([]); drawingPersistence.remove(chartKey); } }, [clearRevision, chartKey]);
  useEffect(() => { drawingsRef.current = drawings; drawingPersistence.save(chartKey, drawings); engineRef.current?.setDrawings(drawingsVisible ? drawings : []); }, [chartKey, drawings, drawingsVisible]);
  useEffect(() => {
    const key = (event) => { const interaction = drawingInteractionRef.current; if (!interaction) return; if (event.key === 'Delete' || event.key === 'Backspace') { interaction.delete(); event.preventDefault(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') { interaction.copy(); event.preventDefault(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') { interaction.paste(); event.preventDefault(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') { interaction.duplicate(); event.preventDefault(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  function point(event) { const box = canvasRef.current.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top }; }
  const axisDragRef = useRef(null);
  const [axisHover, setAxisHover] = useState(null); // 'price' | 'time' | null — drives the cursor style
  function zoneAt(p) {
    const cv = canvasRef.current; if (!cv) return null;
    if (p.x > cv.clientWidth - PRICE_AXIS_W) return 'price';
    if (p.y > (cv.clientHeight || height) - TIME_AXIS_H) return 'time';
    return null;
  }
  function makeDrawingEngine() {
    const engine = engineRef.current; if (!engine) return null;
    const transform = engine.transform();
    return createDrawingEngine({ symbol, timeframe, coordinateSystem: { fromPoint: (p) => transform.pixelToAnchor(p.x, p.y) }, addDrawing: (drawing) => setDrawings((items) => [...items, drawing]) });
  }
  return <canvas
    ref={canvasRef}
    className={className}
    onPointerDown={(event) => {
      const p = point(event);
      const zone = zoneAt(p);
      if (zone === 'price') { axisDragRef.current = { type: 'price', lastY: p.y }; return; }
      if (zone === 'time') { axisDragRef.current = { type: 'time', lastX: p.x, anchorX: p.x }; return; }
      if (tool === 'cursor') {
        const editing = drawingInteractionRef.current?.pointerDown(p, { additive: event.shiftKey });
        const selected = drawingInteractionRef.current?.selectedIds()?.[0] || null;
        console.log('[DRAW] pointerDown', p, '→ hit id =', selected, '| total drawings on this chart =', drawingsRef.current.length);
        engineRef.current?.setSelected(selected);
        if (!editing) { dragRef.current = p; interactionRef.current?.startPan(p); }
        return;
      }
      drawingEngineRef.current = makeDrawingEngine();
      drawingEngineRef.current?.start(p);
    }}
    onPointerMove={(event) => {
      const p = point(event);
      const engine = engineRef.current; if (!engine) return;
      if (axisDragRef.current?.type === 'price') { engine.dragPriceScale(p.y - axisDragRef.current.lastY); axisDragRef.current.lastY = p.y; return; }
      if (axisDragRef.current?.type === 'time') { engine.dragBarWidth(p.x - axisDragRef.current.lastX, axisDragRef.current.anchorX); axisDragRef.current.lastX = p.x; return; }
      if (dragRef.current) interactionRef.current?.movePan(p);
      else if (drawingInteractionRef.current?.mode) drawingInteractionRef.current.pointerMove(p);
      else { engine.setCrosshair(p); setAxisHover(zoneAt(p)); }
    }}
    onPointerUp={(event) => {
      if (axisDragRef.current) { axisDragRef.current = null; return; }
      if (dragRef.current) { dragRef.current = null; interactionRef.current?.endPan(); return; }
      if (drawingInteractionRef.current?.mode) drawingInteractionRef.current.pointerUp();
      else if (tool !== 'cursor') drawingEngineRef.current?.finish(point(event), tool);
    }}
    onPointerLeave={() => { axisDragRef.current = null; setAxisHover(null); dragRef.current = null; drawingInteractionRef.current?.pointerUp(); interactionRef.current?.endPan(); engineRef.current?.setCrosshair(null); }}
    onDoubleClick={(event) => { if (zoneAt(point(event)) === 'price') engineRef.current?.resetPriceScale(); }}
    onWheel={(event) => { event.preventDefault(); interactionRef.current?.zoom(event.deltaY, point(event).x); }}
    style={{
      display: 'block', width: '100%', height, touchAction: 'none',
      cursor: axisHover === 'price' ? 'ns-resize' : axisHover === 'time' ? 'ew-resize' : (tool === 'cursor' ? 'grab' : 'crosshair'),
    }}
  />;
}
