'use client';
import { createChart } from 'lightweight-charts';

export function createChartEngine(container, options = {}) {
  const chart = createChart(container, {
    layout: { background: { color: 'transparent' }, textColor: '#98A2B8' },
    grid: { vertLines: { color: 'rgba(255,255,255,.05)' }, horzLines: { color: 'rgba(255,255,255,.05)' } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,.1)' },
    rightPriceScale: { borderColor: 'rgba(255,255,255,.1)' },
    crosshair: { mode: 0 }, ...options,
  });
  const series = chart.addCandlestickSeries({ upColor: '#22C58B', downColor: '#F0525F', wickUpColor: '#22C58B', wickDownColor: '#F0525F', borderVisible: false });
  return { chart, series, destroy: () => chart.remove() };
}
