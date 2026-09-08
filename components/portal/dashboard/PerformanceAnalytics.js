'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createChart, AreaSeries, LineSeries } from 'lightweight-charts';

export default function PerformanceAnalytics({ 
  monthlyReturns = [],
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  maxDrawdown,
  avgWin,
  avgLoss,
  winRate,
  profitFactor,
  expectancy,
  kellyCriterion,
  isLoading = false 
}) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const hasData = monthlyReturns && monthlyReturns.length > 0;
  // A monthly-returns chart needs at least two real months; one month is not a trend.
  const validMonthly = (Array.isArray(monthlyReturns) ? monthlyReturns : []).filter(d => Number.isFinite(d?.return));
  const hasMonthlyHistory = validMonthly.length >= 2;
  const monthlyData = hasMonthlyHistory ? validMonthly : [];

  // NOTE: this effect is declared before any early return so hook order stays
  // stable across loading / empty / populated renders (Rules of Hooks).
  useEffect(() => {
    if (!chartRef.current || !hasMonthlyHistory) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 260,
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
        timeVisible: false,
        borderColor: 'rgba(255,255,255,.08)',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,.08)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderVisible: false,
      },
      leftPriceScale: { visible: false },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(255,255,255,.15)', width: 1, style: 2, labelBackgroundColor: '#0A140E' },
        horzLine: { color: 'rgba(255,255,255,.15)', width: 1, style: 2, labelBackgroundColor: '#0A140E' },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, pinch: true, mouseWheel: true },
    });

    // lightweight-charts v5: series are created via addSeries(SeriesDefinition, options).
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#22C58B',
      topColor: 'rgba(34, 197, 139, 0.25)',
      bottomColor: 'rgba(34, 197, 139, 0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => Number(price).toFixed(1) + '%',
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: '#F5B93E',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'custom',
        formatter: (price) => Number(price).toFixed(1) + '%',
      },
    });

    const areaData = monthlyData.map((d, i) => ({ time: i, value: Number(d?.return) }));
    let cumulative = 0;
    const lineData = monthlyData.map((d, i) => {
      cumulative += Number.isFinite(d?.return) ? d.return : 0;
      return { time: i, value: cumulative };
    });

    // Validate data before sending to chart - ensure all values are finite numbers
    const validAreaData = areaData.filter(d => Number.isFinite(d.value));
    const validLineData = lineData.filter(d => Number.isFinite(d.value));

    areaSeries.setData(validAreaData);
    lineSeries.setData(validLineData);
    chart.timeScale().fitContent();

    areaSeriesRef.current = areaSeries;
    lineSeriesRef.current = lineSeries;
    chartInstanceRef.current = chart;

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
      areaSeriesRef.current = null;
      lineSeriesRef.current = null;
    };
  }, [hasMonthlyHistory, monthlyData]);

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Performance Analytics</h3>
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
              style={{ padding: '12px' }}
            >
              <div style={{ height: '15px', width: '55%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '26px', width: '45%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Performance Analytics</h3>
        </div>
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: '22px' }}>📊</div>
          <h3 style={{ marginBottom: 6, fontSize: 17 }}>Not enough trading data</h3>
          <p className="muted" style={{ marginBottom: 18, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', fontSize: 13 }}>
            Performance metrics require sufficient trading history. Start trading to see analytics.
          </p>
        </div>
      </div>
    );
  }

  const metrics = [
    { key: 'sharpeRatio', label: 'Sharpe Ratio', value: sharpeRatio, format: 'ratio', color: 'var(--text)', benchmark: '> 1.0', description: 'Risk-adjusted returns' },
    { key: 'sortinoRatio', label: 'Sortino Ratio', value: sortinoRatio, format: 'ratio', color: 'var(--text)', benchmark: '> 1.5', description: 'Downside risk-adjusted' },
    { key: 'calmarRatio', label: 'Calmar Ratio', value: calmarRatio, format: 'ratio', color: 'var(--text)', benchmark: '> 2.0', description: 'Return vs max drawdown' },
    { key: 'maxDrawdown', label: 'Max Drawdown', value: maxDrawdown, format: 'drawdown', color: 'var(--red)', benchmark: '< 10%', description: 'Peak to trough decline' },
    { key: 'avgWin', label: 'Avg Win', value: avgWin, format: 'currency', color: 'var(--green)', benchmark: '> Avg Loss', description: 'Average winning trade' },
    { key: 'avgLoss', label: 'Avg Loss', value: avgLoss, format: 'currency', color: 'var(--red)', benchmark: '< Avg Win', description: 'Average losing trade' },
    { key: 'winRate', label: 'Win Rate', value: winRate, format: 'percent', color: 'var(--text)', benchmark: '> 50%', description: 'Winning trade %' },
    { key: 'profitFactor', label: 'Profit Factor', value: profitFactor, format: 'ratio', color: 'var(--text)', benchmark: '> 1.5', description: 'Gross profit / gross loss' },
    { key: 'expectancy', label: 'Expectancy', value: expectancy, format: 'currency', color: 'var(--text)', benchmark: '> 0', description: 'Expected value per trade' },
    { key: 'kellyCriterion', label: 'Kelly %', value: kellyCriterion, format: 'percent', color: 'var(--text)', benchmark: '5-25%', description: 'Optimal position size' },
  ];

  const formatValue = (metric) => {
    const val = metric.value;
    // Null = the metric is genuinely undefined for the current data
    // (no losing trades, not enough history, no drawdown yet, …).
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return 'N/A';
    switch (metric.format) {
      case 'currency':
        return '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
      case 'percent':
        return `${Number(val || 0).toFixed(1)}%`;
      case 'ratio':
        return Number(val || 0).toFixed(2);
      case 'drawdown':
        return `${Number(val || 0).toFixed(1)}%`;
      default:
        return val;
    }
  };

  const getBenchmarkStatus = (metric) => {
    const val = metric.value;
    if (val === null || val === undefined) return 'neutral';
    switch (metric.key) {
      case 'sharpeRatio': return val >= 1 ? 'good' : val >= 0.5 ? 'warn' : 'bad';
      case 'sortinoRatio': return val >= 1.5 ? 'good' : val >= 1 ? 'warn' : 'bad';
      case 'calmarRatio': return val >= 2 ? 'good' : val >= 1 ? 'warn' : 'bad';
      case 'maxDrawdown': return Math.abs(val) <= 10 ? 'good' : Math.abs(val) <= 15 ? 'warn' : 'bad';
      case 'avgWin': return val > Math.abs(avgLoss ?? 0) ? 'good' : 'warn';
      case 'avgLoss': return Math.abs(val) < (avgWin ?? 0) ? 'good' : 'warn';
      case 'winRate': return val >= 50 ? 'good' : val >= 40 ? 'warn' : 'bad';
      case 'profitFactor': return val >= 1.5 ? 'good' : val >= 1 ? 'warn' : 'bad';
      case 'expectancy': return val > 0 ? 'good' : 'bad';
      case 'kellyCriterion': return val >= 5 && val <= 25 ? 'good' : val > 0 ? 'warn' : 'bad';
      default: return 'neutral';
    }
  };

  const bestReturn = validMonthly.length ? Math.max(...validMonthly.map(d => d.return)) : 0;
  const worstReturn = validMonthly.length ? Math.min(...validMonthly.map(d => d.return)) : 0;

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Performance Analytics</h3>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Monthly Returns */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Monthly Returns</h4>
            {hasMonthlyHistory && (
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
                Best: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{bestReturn.toFixed(1)}%</span>
                {' | '}
                Worst: <span style={{ color: 'var(--red)', fontWeight: 600 }}>{worstReturn.toFixed(1)}%</span>
              </span>
            )}
          </div>
          {hasMonthlyHistory ? (
            <div
              ref={chartRef}
              style={{ width: '100%', minWidth: 0, height: 240, position: 'relative', borderRadius: 'var(--r)', overflow: 'hidden' }}
            />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r)', background: 'rgba(255,255,255,0.02)', textAlign: 'center', padding: '16px' }}>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 280 }}>
                No performance history available yet — at least two months of trading are needed.
              </p>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.key}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.04, ease: [0.19, 1, 0.22, 1] }}
              style={{ 
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <motion.span
                  className="eyebrow"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {metric.label}
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{ marginTop: '6px', marginBottom: '6px' }}
                >
                  <span style={{ 
                    fontFamily: "'Unbounded', 'Manrope', sans-serif", 
                    fontWeight: 800, 
                    fontSize: 'clamp(18px, 2.2vw, 22px)', 
                    lineHeight: 1.1, 
                    color: metric.color,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}>
                    {formatValue(metric)}
                  </span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  style={{ fontSize: '9.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}
                >
                  {metric.description}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                <span style={{ 
                  color: getBenchmarkStatus(metric) === 'good' ? 'var(--green)' : getBenchmarkStatus(metric) === 'warn' ? 'var(--gold)' : 'var(--red)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {getBenchmarkStatus(metric) === 'good' && <span style={{ fontSize: '9.5px' }}>✓</span>}
                  {getBenchmarkStatus(metric) === 'warn' && <span style={{ fontSize: '9.5px' }}>⚠</span>}
                  {getBenchmarkStatus(metric) === 'bad' && <span style={{ fontSize: '9.5px' }}>✗</span>}
                  Benchmark: {metric.benchmark}
                </span>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: getBenchmarkStatus(metric) === 'good' ? 'var(--green)' : getBenchmarkStatus(metric) === 'warn' ? 'var(--gold)' : 'var(--red)',
                }} />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}