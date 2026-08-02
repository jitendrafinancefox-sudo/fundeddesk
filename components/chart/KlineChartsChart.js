'use client';
// MT5/TradingView-style options terminal chart — klinecharts v10 engine
// (open-source, Apache-2.0, designed for trading terminals):
//  - Vertical drawing toolbox: cursor, trendline, horizontal/vertical lines,
//    erase — interactive placements with draggable edit points.
//  - Indicator panes out of the box: MA(5/10/20) on candles + RSI(14) sub-pane.
//  - TradingView dark design (#131722, charcoal grid, neon green/red candles).
//  - Instant seed candles on mount -> live Angel One relay history -> 3s
//    forming-bar stream via the v10 setDataLoader contract.
//  - One-click BUY/SELL panel, ENTRY/SL/TP lines, risk label, ResizeObserver.
import { useEffect, useRef, useState } from 'react';
import { marketData } from '@/services/marketData';
import { normalizeCandles } from '@/services/candleAggregator';
import { contractMultiplier } from '@/services/lotSizes';
import OneClickPanel from '@/components/terminal/OneClickPanel';

const TF_INTERVAL = { '1m': 'ONE_MINUTE', '5m': 'FIVE_MINUTE', '15m': 'FIFTEEN_MINUTE', '1h': 'ONE_HOUR', 'Daily': 'ONE_DAY' };
const TF_SECONDS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, 'Daily': 86400 };

// Instant seed: 80 bars of a random walk, newest last, ascending unix seconds.
function seedCandles(timeframe) {
  const seconds = TF_SECONDS[timeframe] || 60;
  const now = Math.floor(Date.now() / 1000);
  const bars = [];
  let price = 100;
  for (let i = 79; i >= 0; i--) {
    const time = now - i * seconds;
    const open = price;
    const close = Math.max(1, open + (Math.random() - 0.48) * 2.6);
    const high = Math.max(open, close) + Math.random() * 1.1;
    const low = Math.min(open, close) - Math.random() * 1.1;
    bars.push({ timestamp: time, open, high, low, close, volume: 0 });
    price = close;
  }
  return bars;
}

const CHART_STYLES = {
  grid: { horizontal: { color: 'rgba(42,46,57,0.4)' }, vertical: { color: 'rgba(42,46,57,0.4)' } },
  candle: {
    bar: { upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#758696', upBorderColor: '#26a69a', downBorderColor: '#ef5350', upWickColor: '#26a69a', downWickColor: '#ef5350' },
  },
  xAxis: { axisLine: { color: 'rgba(42,46,57,0.8)' }, tickLine: { color: 'rgba(42,46,57,0.8)' }, tickText: { color: '#D1D4DC' } },
  yAxis: { axisLine: { color: 'rgba(42,46,57,0.8)' }, tickLine: { color: 'rgba(42,46,57,0.8)' }, tickText: { color: '#D1D4DC' } },
  separator: { color: 'rgba(42,46,57,0.5)' },
  crosshair: {
    horizontal: { line: { color: '#758696', style: 'dashed' }, text: { backgroundColor: '#363C4E', color: '#D1D4DC' } },
    vertical: { line: { color: '#758696', style: 'dashed' }, text: { backgroundColor: '#363C4E', color: '#D1D4DC' } },
  },
};

const DRAW_TOOLS = [
  ['cursor', '┼', 'Cursor — zoom, pan, edit drawings'],
  ['segment', '╱', 'Trendline — click two points'],
  ['horizontalStraightLine', '─', 'Horizontal line — click to place'],
  ['verticalStraightLine', '│', 'Vertical line — click to place'],
];

const PANEL_THEMES = {
  dark: { bg: 'rgba(19,23,34,.92)', border: 'rgba(197,203,206,.25)', text: '#D1D4DC', sub: '#9AA3B5', inputBg: '#1E222D', inputBorder: 'rgba(197,203,206,.25)' },
};

const num = (value) => value == null ? '—' : Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (value) => '₹' + Math.round(Math.abs(value || 0)).toLocaleString('en-IN');

export default function KlineChartsChart({ id, trading = true, symbol = '', exchange, token, timeframe = '1m', entry = null, sl = null, tp = null, lots = 1, lotSize = 1, bid = null, ask = null, onBuy, onSell }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const pendingRef = useRef(null);
  const riskRef = useRef(null);
  const [tool, setTool] = useState('cursor');
  const [ready, setReady] = useState(false);
  const panel = PANEL_THEMES.dark;

  // Lot-to-quantity logic for the one-click panel.
  const multiplier = contractMultiplier(symbol) || (Number(lotSize) || 1);

  // Mount: dynamic-import klinecharts (browser-only module) and initialize the
  // native canvas chart inside the container, with hard-resize handling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let chart = null;
    let disposeChart = null;
    const resize = () => chartRef.current?.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    window.addEventListener('resize', resize);
    import('klinecharts').then(({ init, dispose }) => {
      if (disposed || !el.isConnected) return;
      disposeChart = dispose;
      chart = init(el, { locale: 'en-US' });
      chart.setStyles(CHART_STYLES);
      chartRef.current = chart;
      setReady(true);
    });
    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (chart && disposeChart) disposeChart(chart);
      chartRef.current = null;
      pendingRef.current = null;
    };
  }, []);

  // Data: v10 feeds the engine through setDataLoader. The loader seeds the
  // instant candles on 'init' so the canvas is never blank, then upgrades with
  // live relay history and streams the forming bar every 3s.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart || !exchange || !token) return;
    const toKLine = (c) => ({ timestamp: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    const intervalOf = (period) => {
      const type = period?.type;
      const span = period?.span;
      if (type === 'day') return 'ONE_DAY';
      if (type === 'hour') return 'ONE_HOUR';
      if (type === 'minute' && span === 15) return 'FIFTEEN_MINUTE';
      if (type === 'minute' && span === 5) return 'FIVE_MINUTE';
      return 'ONE_MINUTE';
    };
    const controller = new AbortController();
    let timer = null;
    let subscribed = false;
    let lastBar = null;

    chart.setDataLoader({
      getBars({ type, period, callback }) {
        const emit = (rows) => callback(rows.map(toKLine), { backward: false, forward: false });
        if (type === 'init') emit(seedCandles(timeframe));
        if (type === 'forward' || type === 'backward') { callback([], { backward: false, forward: false }); return; }
        (async () => {
          let rows = [];
          try {
            rows = normalizeCandles(await marketData.history(exchange, token, intervalOf(period), controller.signal));
          } catch (err) { if (err.name === 'AbortError') return; }
          if (rows.length) emit(rows);
        })();
      },
      subscribeBar({ period, callback }) {
        if (subscribed) return;
        subscribed = true;
        timer = window.setInterval(async () => {
          try {
            const rows = normalizeCandles(await marketData.history(exchange, token, intervalOf(period), controller.signal));
            const last = rows[rows.length - 1];
            if (!last) return;
            const bar = toKLine(last);
            if (!lastBar || lastBar.timestamp !== bar.timestamp || lastBar.close !== bar.close) {
              lastBar = bar;
              callback(bar);
            }
          } catch { /* relay offline — silent */ }
        }, 3000);
      },
      unsubscribeBar() {
        if (timer) { window.clearInterval(timer); timer = null; }
        subscribed = false;
      },
    });

    // Header timeframe buttons drive the chart period — the chart re-requests
    // through the loader for the new grid.
    const periodOf = (tf) => {
      if (tf === 'Daily') return { type: 'day', span: 1 };
      if (tf === '1h') return { type: 'hour', span: 1 };
      if (tf === '15m') return { type: 'minute', span: 15 };
      if (tf === '5m') return { type: 'minute', span: 5 };
      return { type: 'minute', span: 1 };
    };
    chart.setPeriod(periodOf(timeframe));

    // Default indicator panes: MA(5/10/20) on candles, RSI(14) sub-pane.
    chart.createIndicator('MA', false, { id: 'candle_pane' });
    chart.createIndicator('RSI', false, { id: 'rsi_pane' });

    return () => {
      controller.abort();
      if (timer) window.clearInterval(timer);
      subscribed = false;
      lastBar = null;
    };
  }, [ready, exchange, token, timeframe]);

  // ENTRY / SL / TP horizontal lines on the primary trading canvas.
  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !chart) return;
    const list = chart.getDataList();
    const ts = list.length ? list[list.length - 1].timestamp : Math.floor(Date.now() / 1000);
    const ids = ['entry-line', 'sl-line', 'tp-line'];
    for (const id of ids) chart.removeOverlay({ id });
    if (!trading) return;
    const add = (value, color, id) => {
      if (value == null || !Number.isFinite(Number(value))) return;
      chart.createOverlay({
        id,
        name: 'horizontalStraightLine',
        points: [{ timestamp: ts, value: Number(value) }],
        styles: { line: { color, style: 'dashed' } },
        lock: true,
      });
    };
    add(entry, '#26a69a', 'entry-line');
    add(sl, '#ef5350', 'sl-line');
    add(tp, '#2962FF', 'tp-line');
  }, [ready, entry, sl, tp, trading]);

  // Risk label — informational ENTRY / SL / TP readout.
  useEffect(() => {
    const el = riskRef.current;
    if (!el) return;
    const value = (p) => (p == null ? null : Number(p));
    const e = value(entry);
    if (e == null) { el.style.display = 'none'; return; }
    const quantity = (Number(lots) || 1) * (Number(lotSize) || 1);
    const s = value(sl); const t = value(tp);
    const risk = s != null ? Math.round(Math.abs(e - s) * 100) / 100 * quantity : null;
    const reward = t != null ? Math.round(Math.abs(e - t) * 100) / 100 * quantity : null;
    el.style.display = 'block';
    el.innerHTML =
      `<div style="color:#26a69a">● ENTRY ${num(e)}</div>` +
      (s != null ? `<div style="color:#ef5350">● SL ${num(s)} · ${Math.abs(e - s).toFixed(2)} pts · Risk ${inr(risk)}</div>` : '') +
      (t != null ? `<div style="color:#2962FF">● TP ${num(t)} · ${Math.abs(e - t).toFixed(2)} pts · Reward ${inr(reward)}</div>` : '');
  }, [entry, sl, tp, lots, lotSize]);

  // Drawing tools — start/stop interactive placements natively on the canvas.
  function cancelPending() {
    const chart = chartRef.current;
    if (pendingRef.current && chart) chart.removeOverlay({ id: pendingRef.current });
    pendingRef.current = null;
  }
  function activateTool(name) {
    cancelPending();
    if (name === 'cursor') { setTool('cursor'); return; }
    const chart = chartRef.current;
    if (!chart) return;
    const id = chart.createOverlay({ name });
    pendingRef.current = id;
    setTool(name);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: 0, background: '#131722' }}>
      <div
        id={id || undefined}
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Drawing toolbar — vertical, far left, above the canvas. */}
      {ready && <div style={{
        position: 'absolute', left: 8, top: 72, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 4, padding: 5,
        background: panel.bg, border: `1px solid ${panel.border}`, borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,.35)', fontFamily: 'Manrope, sans-serif',
      }}>
        {DRAW_TOOLS.map(([name, glyph, title]) => (
          <button
            key={name}
            title={title}
            onClick={() => activateTool(name)}
            style={{
              width: 26, height: 26, fontSize: 12, cursor: 'pointer', borderRadius: 5,
              color: tool === name ? '#fff' : panel.sub, background: tool === name ? 'rgba(77,124,254,.55)' : 'transparent',
              border: 'none',
            }}
          >{glyph}</button>
        ))}
        <button
          title="Delete all drawings"
          onClick={() => { cancelPending(); chartRef.current?.removeOverlay({}); setTool('cursor'); }}
          style={{ width: 26, height: 26, fontSize: 12, cursor: 'pointer', borderRadius: 5, color: '#ef5350', background: 'transparent', border: 'none' }}
        >🗑️</button>
      </div>}

      {/* One-Click Trading panel — bottom-left of the chart canvas area. */}
      {trading && <OneClickPanel bid={bid} ask={ask} onBuy={onBuy} onSell={onSell} multiplier={multiplier} />}

      <div ref={riskRef} style={{
        position: 'absolute', bottom: 28, right: 8, zIndex: 5, display: 'none', pointerEvents: 'none',
        fontSize: 10.5, lineHeight: 1.7, fontFamily: 'Manrope, sans-serif',
        background: panel.bg, border: `1px solid ${panel.border}`, borderRadius: 8, padding: '5px 9px',
      }} />
    </div>
  );
}
