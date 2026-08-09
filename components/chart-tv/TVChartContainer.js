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
  overlay = null,
  indicators = [],
}) {
  const hostRef = useRef(null);
  const chartRef = useRef(null);
  const overlayRef = useRef(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const chart = new TVChart(host, { theme, chartKey, onError });
    chartRef.current = chart;

    const current = { exchange, token, symbol, interval };
    if (current.symbol) {
      chart
        .setSymbol(current)
        .then(() => {
          if (!readyRef.current) {
            readyRef.current = true;
            chart.fitContent();
          }
        })
        .catch((error) => {
          if (error?.name !== 'AbortError') onError?.(error);
        });
    }

    let root = null;
    if (overlay) {
      root = createOverlayRoot({
        container: host,
        tvChart: chart,
        chartKey: chartKey || 'tv-default',
        identity: { symbol: current.symbol || String(current.token || 'unknown'), timeframe: interval },
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
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !symbol) return undefined;
    const controller = new AbortController();
    chart
      .setSymbol({ exchange, token, symbol, interval }, controller.signal)
      .then(() => {
        overlayRef.current?.setCandles(chart.getCandles());
        chart.setIndicators(buildIndicators(chart.getCandles(), indicators));
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') onError?.(error);
      });
    return () => controller.abort();
  }, [exchange, token, symbol, interval, indicators]);

  return <div ref={hostRef} className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }} />;
}

export { TVChart };
