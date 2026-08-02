'use client';
// Native lightweight-charts canvas engine (npm package — no CDN script, no
// local /charting_library 404s). The terminal layout chart:
//  - Seeds an instant candle series synchronously on mount: green/red
//    candlesticks render immediately beside the left sidebar panel.
//  - Upgrades to real Angel One history from the relay, then a 3s data loop
//    streams the newest forming bar onto the canvas.
//  - One-click BUY/SELL panel, ENTRY/SL/TP price lines, theme sync.
import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { marketData } from '@/services/marketData';
import { normalizeCandles } from '@/services/candleAggregator';
import { contractMultiplier } from '@/services/lotSizes';

const TF_INTERVAL = { '1m': 'ONE_MINUTE', '5m': 'FIVE_MINUTE', '15m': 'FIFTEEN_MINUTE', '1h': 'ONE_HOUR', 'Daily': 'ONE_DAY' };
const TF_SECONDS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, 'Daily': 86400 };

// Seed series: 80 bars of a smooth random walk, newest last — valid
// lightweight-charts data (ascending unix-second times) so the canvas paints
// green/red candles the moment the chart mounts, before the relay responds.
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
    bars.push({ time, open, high, low, close });
    price = close;
  }
  return bars;
}

const chartOptions = (light) => ({
  layout: {
    background: { type: 'solid', color: light ? '#ffffff' : '#131722' },
    textColor: light ? '#191B22' : '#D1D4DC',
  },
  grid: {
    vertLines: { color: light ? '#F0F3FA' : 'rgba(197,203,206,0.06)' },
    horzLines: { color: light ? '#F0F3FA' : 'rgba(197,203,206,0.06)' },
  },
  rightPriceScale: { borderColor: 'rgba(197,203,206,0.25)' },
  timeScale: { borderColor: 'rgba(197,203,206,0.25)', timeVisible: true, secondsVisible: false },
  crosshair: { mode: CrosshairMode.Normal },
});

const PANEL_THEMES = {
  dark: { bg: 'rgba(19,23,34,.92)', border: 'rgba(197,203,206,.25)', text: '#D1D4DC', sub: '#9AA3B5', inputBg: '#1E222D', inputBorder: 'rgba(197,203,206,.25)' },
  light: { bg: 'rgba(255,255,255,.95)', border: '#E6E9F0', text: '#191B22', sub: '#5E6780', inputBg: '#F7F9FD', inputBorder: '#DDE3EF' },
};

const isLightTheme = () => typeof document !== 'undefined' && document.documentElement.classList.contains('light-theme');
const num = (value) => value == null ? '—' : Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = (value) => '₹' + Math.round(Math.abs(value || 0)).toLocaleString('en-IN');

export default function LightweightChart({ id, trading = true, symbol = '', exchange, token, timeframe = '1m', entry = null, sl = null, tp = null, lots = 1, lotSize = 1, bid = null, ask = null, onBuy, onSell }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const riskRef = useRef(null);
  const [light, setLight] = useState(false);
  const [qty, setQty] = useState('1');
  const panel = light ? PANEL_THEMES.light : PANEL_THEMES.dark;

  // Lot-to-quantity logic for the one-click panel.
  const multiplier = contractMultiplier(symbol) || (Number(lotSize) || 1);
  const trueQuantity = (Number(qty) || 0) * multiplier;

  // Track the global theme (class on <html>) and repaint the canvas options.
  useEffect(() => {
    const root = document.documentElement;
    setLight(isLightTheme());
    const observer = new MutationObserver(() => setLight(isLightTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(light));
  }, [light]);

  // Mount: native canvas chart per instrument/timeframe. Seeds instantly,
  // then the relay history + 3s forming-bar loop take over.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, chartOptions(isLightTheme()));
    const series = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      borderVisible: false,
      priceFormat: { type: 'price', precision: 2, minMove: 0.05 },
    });
    chartRef.current = chart;
    seriesRef.current = series;

    // 1) Instant seed — beautiful green/red candles on the canvas now.
    series.setData(seedCandles(timeframe));

    // 2) Real Angel One history, then a 3s data loop pushing the forming bar.
    const controller = new AbortController();
    let timer = null;
    let lastKey = '';
    const refresh = async (streamOnly) => {
      let rows = [];
      try {
        rows = normalizeCandles(await marketData.history(exchange, token, TF_INTERVAL[timeframe], controller.signal));
      } catch { return; }
      if (!rows.length) return;
      const last = rows[rows.length - 1];
      const key = `${last.time}:${last.close}`;
      if (streamOnly) {
        if (key !== lastKey) { lastKey = key; series.update(last); }
      } else {
        lastKey = key;
        series.setData(rows);
      }
    };
    refresh(false);
    timer = window.setInterval(() => refresh(true), 3000);

    // Hard resize handling (v4 has no autosize option).
    const resize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) chart.resize(rect.width, rect.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener('resize', resize);
    resize();

    return () => {
      controller.abort();
      if (timer) window.clearInterval(timer);
      window.removeEventListener('resize', resize);
      ro.disconnect();
      seriesRef.current = null;
      priceLinesRef.current = [];
      chartRef.current = null;
      chart.remove();
      el.innerHTML = '';
    };
  }, [exchange, token, timeframe]);

  // ENTRY / SL / TP price lines on the primary trading canvas.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) { try { series.removePriceLine(line); } catch { /* chart already torn down */ } }
    priceLinesRef.current = [];
    if (!trading) return;
    const add = (value, color, title) => {
      if (value == null || !Number.isFinite(Number(value))) return;
      priceLinesRef.current.push(series.createPriceLine({ price: Number(value), color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title }));
    };
    add(entry, '#0ECB81', 'ENTRY');
    add(sl, '#F6465D', 'SL');
    add(tp, '#4D7CFE', 'TP');
  }, [entry, sl, tp, trading, exchange, token, timeframe]);

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
      `<div style="color:#0ECB81">● ENTRY ${num(e)}</div>` +
      (s != null ? `<div style="color:#F6465D">● SL ${num(s)} · ${Math.abs(e - s).toFixed(2)} pts · Risk ${inr(risk)}</div>` : '') +
      (t != null ? `<div style="color:#4D7CFE">● TP ${num(t)} · ${Math.abs(e - t).toFixed(2)} pts · Reward ${inr(reward)}</div>` : '');
  }, [entry, sl, tp, lots, lotSize]);

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: 0 }}>
      <div
        id={id || undefined}
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: light ? '#ffffff' : '#131722' }}
      />

      {/* One-Click Trading panel — only on the primary trading canvas. */}
      {trading && <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 20,
        display: 'flex', alignItems: 'stretch', gap: 4, pointerEvents: 'auto',
        background: panel.bg, border: `1px solid ${panel.border}`, borderRadius: 8, padding: 4,
        boxShadow: '0 4px 16px rgba(0,0,0,.35)',
        fontFamily: 'Manrope, sans-serif',
      }}>
        <button
          title="SELL market order at bid"
          onClick={() => onSell?.(Math.max(1, Number(qty) || 1), trueQuantity)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'rgba(246,70,93,.16)', color: '#F6465D', border: '1px solid rgba(246,70,93,.5)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>SELL</span>
          <span className="num" style={{ fontSize: 11 }}>{num(bid ?? '—')}</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 3px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: panel.sub }}>LOTS</span>
          <input
            type="number" min="1" value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ width: 52, boxSizing: 'border-box', background: panel.inputBg, border: `1px solid ${panel.inputBorder}`, borderRadius: 6, padding: '4px 6px', color: panel.text, fontSize: 12, textAlign: 'center', outline: 'none' }}
          />
          <span className="num" style={{ fontSize: 9, color: panel.sub, letterSpacing: '.02em' }}>{trueQuantity > 0 ? `${trueQuantity} ctr · ×${multiplier}` : ''}</span>
        </div>
        <button
          title="BUY market order at ask"
          onClick={() => onBuy?.(Math.max(1, Number(qty) || 1), trueQuantity)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'rgba(14,203,129,.16)', color: '#0ECB81', border: '1px solid rgba(14,203,129,.5)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>BUY</span>
          <span className="num" style={{ fontSize: 11 }}>{num(ask ?? '—')}</span>
        </button>
      </div>}

      <div ref={riskRef} style={{
        position: 'absolute', bottom: 28, left: 8, zIndex: 5, display: 'none', pointerEvents: 'none',
        fontSize: 10.5, lineHeight: 1.7, fontFamily: 'Manrope, sans-serif',
        background: panel.bg, border: `1px solid ${panel.border}`, borderRadius: 8, padding: '5px 9px',
      }} />
    </div>
  );
}
