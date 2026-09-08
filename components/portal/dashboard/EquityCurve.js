'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { formatINR } from '@/lib/format';

export default function EquityCurve({
  data = [],
  capital,
  currentEquity,
  period = '1M',
  onPeriodChange,
  height = 300,
  isLoading = false
}) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);

  const [chartData, setChartData] = useState([]);
  const [currentPeriod, setCurrentPeriod] = useState(period);

  // Real realized-equity series: start at the account's actual capital and
  // apply each closed trade's real P&L cumulatively. No synthetic points, no
  // hardcoded balance — the anchor is the plan's capital.
  const computeEquityData = useMemo(() => {
    if (!data.length) return [];

    // The equity curve is strictly `capital + cumulative realized trade P&L`.
    // No real capital → no honest anchor → insufficient-history state (no guess).
    const baseValue = Number(capital);
    if (!Number.isFinite(baseValue) || baseValue <= 0) return [];

    const daysBack = currentPeriod === '1D' ? 1 : currentPeriod === '1W' ? 7 : currentPeriod === '1M' ? 30 : currentPeriod === '3M' ? 90 : 3650;
    const cutoffSec = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);

    const sortedTrades = [...data]
      .filter(t => Number.isFinite(new Date(t.traded_at).getTime()))
      .sort((a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime());
    if (!sortedTrades.length) return [];

    // Cumulative realized equity across ALL trades, then keep the window.
    let runningEquity = baseValue;
    const all = sortedTrades.map(t => {
      runningEquity += Number.isFinite(t.pnl) ? t.pnl : 0;
      return { time: Math.floor(new Date(t.traded_at).getTime() / 1000), value: runningEquity };
    });

    const inWindow = all.filter(p => p.time >= cutoffSec);
    const points = inWindow.length ? inWindow : all;

    // A meaningful curve needs at least two real trade points AND real movement.
    // One point (or a flat net) → insufficient history, not a manufactured range.
    const distinctValues = new Set(points.map(p => p.value));
    if (points.length < 2 || distinctValues.size < 2) return [];

    // Leading anchor at the known starting equity for the window.
    const startValue = points === all ? baseValue : (all[all.indexOf(points[0]) - 1]?.value ?? baseValue);
    const series = [{ time: points[0].time - 60, value: startValue }, ...points];

    // Strictly-ascending, unique timestamps (lightweight-charts asserts on this).
    let lastTime = -Infinity;
    return series.map(p => {
      const t = p.time <= lastTime ? lastTime + 1 : p.time;
      lastTime = t;
      return { time: t, value: p.value };
    });
  }, [data, currentPeriod, capital]);

  // Recompute the series when trades, the selected period, or the account's
  // capital changes. `capital` must be a dependency — switching accounts changes
  // the equity anchor; without it, stale trade-derived values could persist.
  useEffect(() => {
    setChartData(computeEquityData);
  }, [data, currentPeriod, capital]);

  // Chart initialization and updates
  useEffect(() => {
    if (!chartRef.current || isLoading) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height,
      autoSize: true,
      layout: { 
        background: { color: 'transparent' }, 
        textColor: '#C8D8CE',
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      grid: { 
        vertLines: { color: 'rgba(255,255,255,.03)', style: 2 }, 
        horzLines: { color: 'rgba(255,255,255,.03)', style: 2 } 
      },
      timeScale: { 
        timeVisible: true, 
        borderColor: 'rgba(255,255,255,.08)',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,.08)',
        scaleMargins: { top: 0.2, bottom: 0.2 },
        borderVisible: false,
      },
      leftPriceScale: { visible: false },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(255,255,255,.15)', width: 1, style: 2, labelBackgroundColor: '#0A140E' },
        horzLine: { color: 'rgba(255,255,255,.15)', width: 1, style: 2, labelBackgroundColor: '#0A140E' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, pinch: true, mouseWheel: true, pinch: true },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#22C58B',
      topColor: 'rgba(34,197,139,0.25)',
      bottomColor: 'rgba(34,197,139,0)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#22C58B',
      crosshairMarkerBackgroundColor: '#040806',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'custom',
        minMove: 1,
        formatter: (price) => '₹' + Math.round(Number(price)).toLocaleString('en-IN'),
      },
    });

    seriesRef.current = series;
    chartInstanceRef.current = chart;

    const updateData = () => {
      const safe = (Array.isArray(chartData) ? chartData : []).filter(
        p => Number.isFinite(p?.time) && Number.isFinite(p?.value)
      );
      series.setData(safe);
    };

    updateData();
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartInstanceRef.current && chartRef.current) {
        chartInstanceRef.current.resize(chartRef.current.clientWidth, chartRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
      seriesRef.current = null;
    };
  }, [isLoading, chartData]);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === currentPeriod) return;
    setCurrentPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1]?.value : null;
  const firstValue = chartData.length > 0 ? chartData[0]?.value : null;
  const totalChange = (lastValue ?? 0) - (firstValue ?? 0);
  const totalChangePct = firstValue ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  if (isLoading) {
    return (
      <div style={{ width: '100%', height, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,8,6,0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--muted)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Loading equity curve…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div style={{ width: '100%', minWidth: 0, height, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px', maxWidth: 340 }}>
          <div style={{ fontSize: '26px', marginBottom: '10px' }}>📈</div>
          <h3 style={{ marginBottom: 6, fontSize: 15, fontWeight: 600 }}>Insufficient trading history</h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>Your equity curve will appear as trading history builds.</p>
        </div>
      </div>
    );
  }

  const periodBtn = (p) => (
    <button
      key={p}
      onClick={() => handlePeriodChange(p)}
      style={{
        padding: '5px 12px',
        borderRadius: '99px',
        fontSize: '11.5px',
        fontWeight: 600,
        fontFamily: "'Manrope', sans-serif",
        color: currentPeriod === p ? 'var(--text)' : 'var(--muted)',
        background: currentPeriod === p ? 'var(--grad)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
      }}
    >
      {p}
    </button>
  );

  return (
    <div style={{ width: '100%', minWidth: 0, padding: '14px 14px 6px' }}>
      {/* Header row: canonical current value on the left, period selector on the right.
          The summary lives here — never floating over the plot area. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(16px, 1.9vw, 20px)', color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
              {formatINR(lastValue, { decimals: 0 })}
            </span>
            <span style={{ color: totalChange >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', fontFamily: "'Manrope', sans-serif" }}>
              {totalChange >= 0 ? '▲' : '▼'} {Math.abs(totalChangePct).toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Inter', sans-serif", marginTop: '2px' }}>
            Equity • {currentPeriod}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', padding: '3px', border: '1px solid var(--border)', flexShrink: 0 }}>
          {['1D', '1W', '1M', '3M', 'ALL'].map(periodBtn)}
        </div>
      </div>

      {/* Plot area — unobstructed */}
      <div
        ref={chartRef}
        style={{ width: '100%', minWidth: 0, height, borderRadius: 'var(--r)', overflow: 'hidden', background: 'transparent' }}
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}