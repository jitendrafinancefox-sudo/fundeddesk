'use client';
import { sma, ema, vwap, rsi, macd, volume } from './engine/IndicatorCalculations';

// Single source of truth for the indicator catalogue: what exists, how it is
// labelled, and how it turns candles into renderable series. The chart and the
// toolbar menu both read from here, so adding an indicator later means editing
// this list only — never the renderer or the UI.
//
// `pane: 'overlay'` draws on the price candles; `pane: 'lower'` draws in the
// lower region of the canvas (RSI / MACD / volume style studies).
export const INDICATORS = [
  { id: 'sma20', label: 'SMA (20)', pane: 'overlay', build: (c) => [{ kind: 'line', color: '#4d7cfe', points: sma(c, 20) }] },
  { id: 'sma50', label: 'SMA (50)', pane: 'overlay', build: (c) => [{ kind: 'line', color: '#7c9cff', points: sma(c, 50) }] },
  { id: 'ema20', label: 'EMA (20)', pane: 'overlay', build: (c) => [{ kind: 'line', color: '#f5b93e', points: ema(c, 20) }] },
  { id: 'ema50', label: 'EMA (50)', pane: 'overlay', build: (c) => [{ kind: 'line', color: '#ffd98a', points: ema(c, 50) }] },
  { id: 'vwap', label: 'VWAP', pane: 'overlay', build: (c) => [{ kind: 'line', color: '#ad7aff', points: vwap(c) }] },
  { id: 'volume', label: 'Volume', pane: 'lower', build: (c) => [{ kind: 'volume', points: volume(c) }] },
  { id: 'rsi', label: 'RSI (14)', pane: 'lower', build: (c) => [{ kind: 'rsi', color: '#f5b93e', points: rsi(c) }] },
  {
    id: 'macd',
    label: 'MACD (12, 26, 9)',
    pane: 'lower',
    build: (c) => {
      const m = macd(c);
      return [
        { kind: 'line', color: '#34d399', points: m.line },
        { kind: 'line', color: '#fb7185', points: m.signal },
        { kind: 'histogram', points: m.histogram },
      ];
    },
  },
];

const byId = new Map(INDICATORS.map((indicator) => [indicator.id, indicator]));

export function getIndicator(id) { return byId.get(id) || null; }

// Builds only the indicators the user has switched on. An empty selection
// returns an empty array, which is why a fresh chart now starts clean.
export function buildIndicators(candles, activeIds = []) {
  if (!candles?.length || !activeIds.length) return [];
  return activeIds.flatMap((id) => {
    const indicator = byId.get(id);
    if (!indicator) return [];
    try { return indicator.build(candles); } catch { return []; }
  });
}
