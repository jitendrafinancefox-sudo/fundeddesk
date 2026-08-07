'use client';

import { useEffect, useRef, useState } from 'react';
import TVChartContainer from '@/components/chart-tv/TVChartContainer';
import { TV_TIMEFRAME_LABELS } from '@/components/chart-tv/TVChartSeries';
import ChartContextMenu from '@/components/chart/ui/ChartContextMenu';
import PropertiesPanel from '@/components/chart/ui/PropertiesPanel';
import DrawingFlyout from '@/components/chart/ui/DrawingFlyout';
import { isZoneType, isChannelType, isStrokeType, isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';

const EXCHANGE = 'NSE';
const CHARTS = [
  { key: 'a', label: 'NIFTY', token: '99926000' },
  { key: 'b', label: 'BANKNIFTY', token: '99926009' },
];
const TOOLS = [
  { id: 'cursor', label: 'Cursor', title: 'Cursor / selection' },
  { id: 'crossline', label: 'Crosshair', title: 'Crosshair tool' },
  { id: 'trend', label: 'Trend', title: 'Trend Line' },
  { id: 'arrow', label: 'Arrow', title: 'Arrow' },
  { id: 'ray', label: 'Ray', title: 'Ray' },
  { id: 'hline', label: 'Horizontal', title: 'Horizontal Line' },
  { id: 'vline', label: 'Vertical', title: 'Vertical Line' },
  { id: 'rect', label: 'Rectangle', title: 'Rectangle' },
  { id: 'extended', label: 'Extended', title: 'Extended Line' },
  { id: 'parallelChannel', label: 'Channel', title: 'Parallel Channel' },
  { id: 'brush', label: 'Brush', title: 'Brush (freehand)' },
  { id: 'text', label: 'Text', title: 'Text note' },
  { id: 'fib', label: 'Fib', title: 'Fib Retracement' },
  { id: 'riskReward', label: 'Risk/Reward', title: 'Risk Reward' },
  { id: 'longPosition', label: 'Long', title: 'Long Position' },
  { id: 'shortPosition', label: 'Short', title: 'Short Position' },
  { id: 'measure', label: 'Measure', title: 'Measure' },
];

const toolStyle = { padding: '5px 10px', fontSize: 11, fontFamily: 'Inter, sans-serif', border: '1px solid #e5e7eb', borderRadius: 6, background: '#ffffff', color: '#6b7280', cursor: 'pointer' };
const toolActive = { ...toolStyle, background: '#22ab94', borderColor: '#22ab94', color: '#ffffff' };

export default function TVOverlayPage() {
  const rootsRef = useRef({});
  const chartsRef = useRef({});
  const [activeKey, setActiveKey] = useState('a');
  const [tool, setTool] = useState('cursor');
  const [magnet, setMagnet] = useState(true);
  const [selectedCount, setSelectedCount] = useState({ a: 0, b: 0 });
  const [counts, setCounts] = useState({ a: 0, b: 0 });
  const [menu, setMenu] = useState(null);       // { chart, x, y, id, bounds }
  const [properties, setProperties] = useState(null); // { chart, id }
  const [flyout, setFlyout] = useState(null);   // { chart, x, y, id }
  const [live, setLive] = useState(true);
  const [seedError, setSeedError] = useState(null);
  const [painted, setPainted] = useState(null);

  useEffect(() => {
    const root = rootsRef.current[activeKey];
    root?.setTool(tool);
  }, [tool, activeKey]);

  useEffect(() => {
    Object.values(rootsRef.current).forEach((root) => root?.configureSnap({ magnet, mode: 'ohlc' }));
  }, [magnet]);

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => {
      const chart = chartsRef.current.a;
      const root = rootsRef.current.a;
      if (!chart || !root) return;
      const last = chart.getLastCandle();
      if (!last) return;
      const drift = (Math.random() - 0.48) * 0.003;
      const close = Number((last.close * (1 + drift)).toFixed(2));
      chart.updateCandle({ ...last, high: Math.max(last.high, close), low: Math.min(last.low, close), close });
    }, 1500);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setMenu(null); setProperties(null); setFlyout(null); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const overlayProps = (chart) => ({
    snap: { magnet, mode: 'ohlc' },
    activeRef: { current: false },
    onReady: (root) => {
      rootsRef.current[chart.key] = root;
      root.setActive(true);
      setCounts((prev) => ({ ...prev, [chart.key]: root.getDrawings().length }));
      root.bus.on('drawings:changed', (list) => setCounts((prev) => ({ ...prev, [chart.key]: list.length })));
    },
    onSelectionChange: (ids) => setSelectedCount((prev) => ({ ...prev, [chart.key]: ids.length })),
    onContextMenu: (payload) => setMenu({ chart: chart.key, ...payload }),
    onProperties: (payload) => setProperties(payload ? { chart: chart.key, ...payload } : null),
  });

  const menuDrawing = menu?.id ? rootsRef.current[menu.chart]?.getDrawings().find((d) => d.id === menu.id) || null : null;
  const propertiesDrawing = properties?.id ? rootsRef.current[properties.chart]?.getDrawings().find((d) => d.id === properties.id) || null : null;
  const flyoutDrawing = flyout?.id ? rootsRef.current[flyout.chart]?.getDrawings().find((d) => d.id === flyout.id) || null : null;

  const runMenuAction = (action) => {
    const root = rootsRef.current[menu.chart];
    if (!root) return;
    const interaction = root.getInteraction();
    const id = menu?.id || null;
    if (action === 'properties' && id) setProperties({ chart: menu.chart, id });
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
      interaction?.updateStyle(id, { [key]: menuDrawing?.style?.[key] === false });
    }
    else if (action === 'channelDash' && id) interaction?.updateStyle(id, { dash: !menuDrawing?.style?.dash });
    else if (action === 'channelArrow' && id) interaction?.updateStyle(id, { arrow: !menuDrawing?.style?.arrow });
    else if (action === 'positionFlip' && id) interaction?.flipPosition(id);
    else if (action === 'positionShowLabels' && id) interaction?.updateStyle(id, { showLabels: menuDrawing?.style?.showLabels === false });
    else if (action === 'positionShowRR' && id) interaction?.updateStyle(id, { showRR: menuDrawing?.style?.showRR === false });
    else if (action === 'textAutoSizeReset' && id) interaction?.updateText(id, { autoSize: true });
    else if (action === 'textToggleSnap' && id) interaction?.updateText(id, { snapToCandle: menuDrawing?.text?.snapToCandle === false });
    else if (action === 'editPoints' && id) { root.setPointEdit(interaction?.togglePointEdit(id)); }
    else if (action === 'pointInsert' && id) interaction?.insertAnchorAt(id, menu.x, menu.y);
    else if (action === 'pointDelete' && id) interaction?.deleteAnchorAt(id, menu.x, menu.y);
    else if (action === 'pointSmooth' && id) interaction?.convertAnchorAt(id, menu.x, menu.y, true);
    else if (action === 'pointSharp' && id) interaction?.convertAnchorAt(id, menu.x, menu.y, false);
    setMenu(null);
  };

  const seedChart = (chartKey, root) => {
    const candles = root.getCandles();
    if (!candles?.length) return;
    const n = candles.length;
    const tail = (offset) => candles[Math.max(0, n - 1 - offset)];
    const c20 = tail(27); const c35 = tail(21); const c50 = tail(13);
    const c65 = tail(6); const c80 = tail(2); const c90 = tail(1);
    const mid = (a, b) => (a.price + b.price) / 2;
    const anchors = [];
    const mk = (drawingType, anchorPoints, style = {}, extra = {}) => {
      const drawing = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `seed-${Math.random().toString(36).slice(2, 10)}`,
        symbol: root.identity.symbol, timeframe: root.identity.timeframe,
        drawingType, anchorPoints, style, ...extra,
      };
      anchors.push(drawing);
    };
    mk('trend', [{ time: c20.time, price: c20.low }, { time: c80.time, price: c80.high }], { color: '#4d7cfe', lineWidth: 1.5 });
    mk('ray', [{ time: c35.time, price: c35.high }, { time: c65.time, price: c65.low }], { color: '#f5b93e', lineWidth: 1.2 });
    mk('hline', [{ time: c50.time, price: mid(c20, c50) }], { color: '#8a8f98', lineWidth: 1 });
    mk('extended', [{ time: c20.time, price: mid(c20, c80) * 0.998 }, { time: c80.time, price: mid(c20, c80) * 1.002 }], { color: '#a855f7', lineWidth: 1 });
    mk('rect', [{ time: c35.time, price: c80.high }, { time: c65.time, price: c50.low }], { color: '#22ab94', lineWidth: 1.5 });
    mk('parallelChannel', [{ time: c20.time, price: c20.low }, { time: c80.time, price: c80.low }, { time: c50.time, price: mid(c20, c50) }], { color: '#f23645', lineWidth: 1.2 });
    mk('fib', [{ time: c80.time, price: c80.low }, { time: c20.time, price: c20.high }], { color: '#4d7cfe', lineWidth: 1 });
    mk('longPosition', [{ time: c50.time, price: mid(c50, c80) }, { time: c50.time, price: mid(c50, c80) * 0.995 }, { time: c50.time, price: mid(c50, c80) * 1.005 }], { color: '#22ab94' }, { position: root.properties.defaultsFor('longPosition') });
    mk('text', [{ time: c65.time, price: c65.high }], { color: '#111827' }, { text: root.properties.defaultsFor('text') });
    mk('measure', [{ time: c20.time, price: c20.high }, { time: c35.time, price: c35.low }], { color: '#ef4444', lineWidth: 1.2 });
    anchors.forEach((drawing) => root.getInteraction().place(drawing));
    sessionStorage.setItem(`fd-seed-${root.chartKey}`, '1');
  };

  const seedAll = (attempt = 0) => {
    try {
      const entries = Object.entries(rootsRef.current);
      if (!entries.length) return;
      let pending = false;
      entries.forEach(([key, root]) => {
        if (sessionStorage.getItem(`fd-seed-${root.chartKey}`)) return;
        if (root.getDrawings().length) return;
        if (!root.getCandles()?.length) { pending = true; return; }
        seedChart(key, root);
      });
      if (pending && attempt < 40) { setTimeout(() => seedAll(attempt + 1), 250); return; }
      setSeedError(null);
      setTimeout(() => {
        const readLayers = (key) => {
          const layers = {};
          ['drawings', 'selection', 'handles', 'preview'].forEach((name) => {
            const c = document.querySelector(`[data-chart-key="${key}"] .fd-overlay-${name}`);
            const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
            let n = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n += 1;
            layers[name] = n;
          });
          return layers;
        };
        const stats = {};
        Object.entries(rootsRef.current).forEach(([key, root]) => {
          const canvas = document.querySelector(`[data-chart-key="${key}"] .fd-overlay-drawings`);
          if (!canvas) { stats[key] = 'no-canvas'; return; }
          try {
            const first = root.getDrawings()[0];
            let mapped = null;
            if (first) {
              const ts = root.viewport.tvChart.chart.timeScale();
              const range = ts.getVisibleLogicalRange();
              const lastC = root.getCandles().at(-1);
              const lastP = root.viewport.projection.anchorToPixel({ time: lastC?.time, price: lastC?.close });
              const p = root.viewport.projection.anchorToPixel(first.anchorPoints[0]);
              mapped = `anchor:${JSON.stringify(p)} nC:${root.getCandles().length} range:${range ? JSON.stringify({ f: Math.round(range.from), t: Math.round(range.to) }) : 'null'} lastP:${JSON.stringify(lastP)}`;
            }
            const layers = readLayers(key);
            const lastRender = root.renderer.debug?.lastRender ? `L:${root.renderer.debug.lastRender.count}/${root.renderer.debug.lastRender.painted} c:${root.renderer.debug.lastRender.firstColor} t:${root.renderer.debug.lastRender.firstType}` : 'L:none';
            const tp = root.getDrawings()[0] ? root.renderer.testPaint(root.getDrawings()[0]) : -1;
            const dbg = root.debug ? ` flushes:${root.debug.flushes} paints:${root.debug.paints} raf:${root.debug.rafFired} err:${root.debug.lastError ? String(root.debug.lastError).slice(0, 120) : 'none'}` : '';
            root.invalidate();
            setTimeout(() => {
              const after = readLayers(key);
              setPainted((prev) => ({ ...(prev || {}), [key]: `draw:${layers.drawings} ${lastRender} testOne:${tp} sel:${layers.selection} hand:${layers.handles} -> afterInvalidate draw:${after.drawings} sel:${after.selection}${dbg} ${mapped}` }));
            }, 800);
            stats[key] = `probe ${mapped}`;
          } catch (error) {
            stats[key] = `err:${error?.message || error}`;
          }
        });
        setPainted(stats);
      }, 800);
    } catch (error) {
      setSeedError(String(error?.message || error));
      console.error('seed failed', error);
    }
  };

  useEffect(() => { seedAll(); }, []);

  const onSelectionBus = (chartKey, root) => {    root.bus.on('selection:changed', (ids) => {
      const rootNow = rootsRef.current[chartKey];
      if (ids.length === 1) {
        const drawing = rootNow?.getDrawings().find((d) => d.id === ids[0]);
        if (drawing && !isZoneType(drawing.drawingType) && !isStrokeType(drawing.drawingType) && !isTextType(drawing.drawingType) && !isPositionType(drawing.drawingType)) {
          const transform = rootNow.viewport.get();
          const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
          if (points.length >= 2) {
            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            setFlyout({ chart: chartKey, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.min(...ys) - 8, id: ids[0] });
            return;
          }
        }
      }
      setFlyout(null);
    });
  };

  return (
    <main style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, sans-serif', padding: 12 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: '#111827', marginRight: 8 }}>Phase 9 — Overlay Engine</strong>
        {TOOLS.map((t) => (
          <button key={t.id} title={t.title} style={tool === t.id ? toolActive : toolStyle} onClick={() => setTool(t.id)}>
            {t.label}
          </button>
        ))}
        <span style={{ width: 1, height: 22, background: '#e5e7eb' }} />
        <button style={magnet ? toolActive : toolStyle} title="Snap to OHLC" onClick={() => setMagnet((v) => !v)}>magnet {magnet ? 'on' : 'off'}</button>
        <button style={toolStyle} title="Undo (Ctrl+Z)" onClick={() => rootsRef.current[activeKey]?.undo()}>undo</button>
        <button style={toolStyle} title="Redo" onClick={() => rootsRef.current[activeKey]?.redo()}>redo</button>
        <button style={toolStyle} title="Clear all drawings" onClick={() => rootsRef.current[activeKey]?.clearAll()}>clear</button>
        <button style={toolStyle} title="Seed demo drawings on both charts" onClick={seedAll}>seed</button>
        <button style={live ? toolActive : toolStyle} onClick={() => setLive((v) => !v)}>live {live ? 'on' : 'off'}</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          active: <b style={{ color: '#111827' }}>{CHARTS.find((c) => c.key === activeKey)?.label}</b>
          {' · '}objects {counts.a + counts.b} ({counts.a}+{counts.b})
          {' · '}selected {selectedCount.a + selectedCount.b}
          {' · '}ESC cancel · SHIFT constrain/multi · ALT duplicate · CTRL no-snap
          {seedError ? <b style={{ color: '#f23645' }}> seed error: {seedError}</b> : null}
          {painted ? <span> painted: {Object.entries(painted).map(([k, v]) => `${k}:${v}`).join(' ')}</span> : null}
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {CHARTS.map((chart) => (
          <div
            key={chart.key}
            data-chart-key={chart.key}
            style={{ border: activeKey === chart.key ? '1px solid #22ab94' : '1px solid #e5e7eb', borderRadius: 8, padding: 6 }}
            onPointerEnter={() => {
              setActiveKey(chart.key);
              Object.entries(rootsRef.current).forEach(([key, root]) => root?.setActive(key === chart.key));
            }}
          >
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
              <b style={{ color: '#111827' }}>{chart.label}</b>
              <span>{counts[chart.key]} objects · {selectedCount[chart.key]} selected</span>
            </div>
            <TVChartContainer
              exchange={EXCHANGE}
              token={chart.token}
              symbol={chart.label}
              interval="FIVE_MINUTE"
              chartKey={`tv-overlay-${chart.key}`}
              overlay={overlayProps(chart)}
              onReady={(chartApi, root) => {
                chartsRef.current[chart.key] = chartApi;
                root?.setCandles(chartApi.getCandles());
                onSelectionBus(chart.key, root);
              }}
              onError={(error) => console.error(chart.key, error)}
              style={{ width: '100%', height: 'calc(100vh - 130px)', minHeight: 380 }}
            />
          </div>
        ))}
      </div>

      {menu && (
        <ChartContextMenu
          x={menu.x} y={menu.y} id={menu.id}
          locked={menuDrawing?.locked} hidden={menuDrawing?.hidden}
          zone={menuDrawing && isZoneType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, showLabel: menuDrawing.style?.showLabel !== false, showPrice: menuDrawing.style?.showPrice !== false } : null}
          channel={menuDrawing && isChannelType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, dash: Boolean(menuDrawing.style?.dash), arrow: Boolean(menuDrawing.style?.arrow) } : null}
          stroke={menuDrawing && isStrokeType(menuDrawing.drawingType) ? { editing: rootsRef.current[menu.chart]?.getPointEditId() === menuDrawing.id, points: menuDrawing.anchorPoints.length } : null}
          position={menuDrawing && isPositionType(menuDrawing.drawingType) ? { showLabels: menuDrawing.style?.showLabels !== false, showRR: menuDrawing.style?.showRR !== false } : null}
          text={menuDrawing && isTextType(menuDrawing.drawingType) ? { autoSize: menuDrawing.text?.autoSize !== false, snapToCandle: menuDrawing.text?.snapToCandle !== false } : null}
          hasClipboard={Boolean(rootsRef.current[menu.chart]?.getInteraction()?.clipboard?.length)}
          bounds={menu.bounds}
          onAction={runMenuAction}
          onClose={() => setMenu(null)}
        />
      )}
      {flyout && flyoutDrawing && (
        <DrawingFlyout
          drawing={flyoutDrawing}
          position={{ x: flyout.x, y: flyout.y }}
          onStyle={(patch) => rootsRef.current[flyout.chart]?.getInteraction()?.updateStyle(flyout.id, patch)}
          onDelete={() => { rootsRef.current[flyout.chart]?.getInteraction()?.delete(); setFlyout(null); }}
          onClose={() => setFlyout(null)}
        />
      )}
      {propertiesDrawing && properties && (
        <PropertiesPanel
          drawing={propertiesDrawing}
          onStyle={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateStyle(properties.id, patch)}
          onFib={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateFib(properties.id, patch)}
          onPosition={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updatePosition(properties.id, patch)}
          onText={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateText(properties.id, patch)}
          onTextLive={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateTextLive(properties.id, patch)}
          onFlip={() => rootsRef.current[properties.chart]?.getInteraction()?.flipPosition(properties.id)}
          onLockToggle={(locked) => (locked ? rootsRef.current[properties.chart]?.getInteraction()?.lock([properties.id]) : rootsRef.current[properties.chart]?.getInteraction()?.unlock([properties.id]))}
          onPointEdit={(id) => { const root = rootsRef.current[properties.chart]; root?.setPointEdit(root.getInteraction()?.togglePointEdit(id)); }}
          onClose={() => setProperties(null)}
        />
      )}
    </main>
  );
}
