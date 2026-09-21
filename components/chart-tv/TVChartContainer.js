'use client';

import { useEffect, useRef } from 'react';
import { TVChart } from './TVChart';
import { TV_LIGHT_THEME } from './TVChartTheme';
import { createOverlayRoot } from './overlay/OverlayRoot';
import { buildIndicators } from '@/components/chart/IndicatorEngine';

export default function TVChartContainer({
  exchange,
  token,
  symbol,
  interval = 'FIVE_MINUTE',
  theme = TV_LIGHT_THEME,
  chartKey,
  className,
  style,
  onReady,
  onError,
  onLoadingChange,
  onChartClick,
  overlay = null,
  indicators = [],
}) {
  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const overlayRef = useRef(null);
  // TVChart is constructed once (mount-only effect below) and only reads
  // onClick at that moment, so a fresh onChartClick identity every render
  // (TVTerminal passes an inline closure per panel) would otherwise go
  // stale. Routing through a ref that's updated every render — with a
  // stable wrapper handed to TVChart — keeps the click handler current
  // without re-creating the chart.
  const onChartClickRef = useRef(onChartClick);
  onChartClickRef.current = onChartClick;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const chart = new TVChart(host, { theme, chartKey, onError, onClick: (payload) => onChartClickRef.current?.(payload) });
    chartRef.current = chart;

    let root = null;
    if (overlay) {
      root = createOverlayRoot({
        container: host,
        tvChart: chart,
        chartKey: chartKey || 'tv-default',
        identity: { symbol: symbol || String(token || 'unknown'), timeframe: interval },
        snap: overlay.snap,
        activeRef: overlay.activeRef || null,
        onReady: overlay.onReady,
        onDrawingsChange: overlay.onDrawingsChange,
        onSelectionChange: overlay.onSelectionChange,
        onContextMenu: overlay.onContextMenu,
        onProperties: overlay.onProperties,
      });
      overlayRef.current = root;
    }

    onReady?.(chart, root);

    return () => {
      root?.destroy();
      overlayRef.current = null;
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  // Every time this effect actually re-runs — i.e. exchange/token/symbol/
  // interval genuinely changed, never on a live PriceBus tick or a user's
  // manual pan/zoom, neither of which touch these deps — the new dataset's
  // own latest region must become the visible one. Previously this only
  // happened on the very first load (a `isInitial` gate around
  // fitContent()), so every subsequent symbol/timeframe switch left the
  // OLD symbol's time-scale viewport in place: setData() replaces the
  // candles, but Lightweight Charts does not reposition the visible range
  // on its own, so the new series was scaled/positioned against a window
  // that had nothing to do with its own data. scrollToRealtime() (already
  // defined on TVChart, previously unused anywhere) moves the right edge
  // of the time scale to the latest bar at the chart's configured bar
  // spacing — unlike fitContent(), it doesn't squeeze the entire history
  // into view, so recent candles keep a normal, readable width. Moving the
  // visible range is what lets the existing autoScale (already enabled in
  // TVChartTheme.js, never disabled anywhere) recompute the price axis
  // from the new symbol's own visible candles instead of stale state.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !symbol) return undefined;
    const controller = new AbortController();
    // Flip to "loading" the instant a new symbol/timeframe is requested —
    // BEFORE the request resolves — so a consumer (the OHLC header) knows
    // not to trust the chart's still-installed PREVIOUS candles as if they
    // belonged to this new identity. Only cleared back to "not loading" once
    // this exact request settles (success or a genuine, non-aborted error);
    // a superseded (aborted) request leaves loading state to whichever newer
    // effect instance actually owns it.
    onLoadingChange?.(true);
    chart
      .setSymbol({ exchange, token, symbol, interval }, controller.signal)
      .then(() => {
        overlayRef.current?.setCandles(chart.getCandles());
        chart.setIndicators(buildIndicators(chart.getCandles(), indicators));
        chart.scrollToRealtime();
        onLoadingChange?.(false);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        onLoadingChange?.(false);
        onError?.(error);
      });
    return () => controller.abort();
  }, [exchange, token, symbol, interval, indicators]);

  return <div ref={hostRef} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }} />;
}

export { TVChart };
