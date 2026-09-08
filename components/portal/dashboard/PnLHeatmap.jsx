'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MS_DAY = 24 * 60 * 60 * 1000;

function formatPnlValue(n) {
  if (n === null || n === undefined) return '—';
  const prefix = n >= 0 ? '+' : '−';
  return prefix + '₹' + Math.abs(n).toLocaleString('en-IN');
}

function periodWeeks(periodKey) {
  switch (periodKey) {
    case '1W': return 1;
    case '1M': return 5;
    case '3M': return 14;
    case '6M': return 27;
    case 'YTD': return 53;
    default: return 53; // ALL — bounded, still covers a year of weekly cells
  }
}

// Buckets every REAL trade's P&L onto its actual calendar day, then places that
// day in the correct week column / weekday row of the selected window. Nothing
// is synthesised and no real trade day is dropped: week indices are remapped to
// be contiguous and weekend days are kept (rendered only when present).
function generateHeatmapData(periodKey, tradeData) {
  if (!Array.isArray(tradeData) || tradeData.length === 0) return [];

  const byDate = {};
  tradeData.forEach(t => {
    const dt = new Date(t.traded_at);
    if (Number.isNaN(dt.getTime())) return;
    const dayStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const key = dayStart.getTime();
    if (!byDate[key]) byDate[key] = { pnl: 0, trades: 0, dayStart };
    byDate[key].pnl += Number.isFinite(t.pnl) ? t.pnl : 0;
    byDate[key].trades += 1;
  });
  const entries = Object.values(byDate);
  if (!entries.length) return [];

  // Window anchor: Monday of the current week, back N weeks.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (todayStart.getDay() + 6) % 7; // 0 when today is Monday
  const thisMonday = new Date(todayStart.getTime() - mondayOffset * MS_DAY);
  const windowStart = new Date(thisMonday.getTime() - (periodWeeks(periodKey) - 1) * 7 * MS_DAY);

  const cells = [];
  entries.forEach(e => {
    const diffDays = Math.floor((e.dayStart.getTime() - windowStart.getTime()) / MS_DAY);
    if (diffDays < 0) return; // before the selected window
    const weekday = (e.dayStart.getDay() + 6) % 7; // Mon=0 … Sun=6
    cells.push({
      week: Math.floor(diffDays / 7),
      day: weekday,
      dayName: DAY_LABELS[weekday],
      pnl: e.pnl,
      trades: e.trades,
      date: e.dayStart.toDateString(),
    });
  });
  if (!cells.length) return [];

  // Remap sparse week indices to a contiguous 0..n-1 range so the renderer's
  // `week < weeksCount` iteration can never skip a populated column.
  const usedWeeks = [...new Set(cells.map(c => c.week))].sort((a, b) => a - b);
  const remap = new Map(usedWeeks.map((w, i) => [w, i]));
  return cells.map(c => ({ ...c, week: remap.get(c.week) }));
}

export default function PnLHeatmap({ 
  data = [], 
  period = '1M',
  onPeriodChange,
  isLoading = false 
}) {
  const periods = ['1W', '1M', '3M', '6M', 'YTD', 'ALL'];

  // Local period state actually drives the heatmap window. `onPeriodChange` is
  // still invoked for any parent that wants to observe it, but is not required.
  const [currentPeriod, setCurrentPeriod] = useState(period);
  const selectPeriod = (p) => { setCurrentPeriod(p); onPeriodChange?.(p); };

  const heatmapData = generateHeatmapData(currentPeriod, data);
  const maxPnl = Math.max(...heatmapData.map(d => Math.abs(d.pnl)), 1);
  const weeksCount = Math.max(1, [...new Set(heatmapData.map(d => d.week))].length);
  const cellSize = Math.max(14, Math.min(24, Math.floor(600 / Math.max(weeksCount, 1))));
  // Weekday rows: Mon–Fri always, plus Sat/Sun only when real weekend trades exist.
  const maxWeekday = heatmapData.reduce((m, d) => Math.max(m, d.day), 4);
  const dayRows = DAY_LABELS.slice(0, maxWeekday + 1);

  const hasData = heatmapData.length > 0;

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>P&L Heatmap</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', padding: '4px', border: '1px solid var(--border)' }}>
              {periods.map((p) => (
                <button key={p} style={{ padding: '6px 12px', borderRadius: '99px', fontSize: '10.5px', fontWeight: 600, color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(' + weeksCount + ', ' + cellSize + 'px)', gap: '4px' }}>
              {Array.from({ length: 5 }).map((_, day) => (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Array.from({ length: weeksCount }).map((_, week) => (
                    <div key={week} style={{ width: cellSize, height: cellSize, borderRadius: '4px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>P&L Heatmap</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', padding: '4px', border: '1px solid var(--border)' }}>
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => selectPeriod(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '99px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    fontFamily: "'Manrope', sans-serif",
                    letterSpacing: '.05em',
                    color: currentPeriod === p ? 'var(--text)' : 'var(--muted)',
                    background: currentPeriod === p ? 'var(--grad)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s var(--ease)',
                    boxShadow: currentPeriod === p ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: '22px' }}>📊</div>
          <h3 style={{ marginBottom: 6, fontSize: 17 }}>No trading data available</h3>
          <p className="muted" style={{ marginBottom: 18, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', fontSize: 13 }}>
            P&L heatmap requires sufficient trading history. Start trading to see daily P&L patterns.
          </p>
        </div>
      </div>
    );
  }

  // Render main heatmap
  return renderHeatmap();
  
  function renderHeatmap() {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>P&L Heatmap</h3>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', padding: '4px', border: '1px solid var(--border)' }}>
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => selectPeriod(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '99px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    fontFamily: "'Manrope', sans-serif",
                    letterSpacing: '.05em',
                    color: currentPeriod === p ? 'var(--text)' : 'var(--muted)',
                    background: currentPeriod === p ? 'var(--grad)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s var(--ease)',
                    boxShadow: currentPeriod === p ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>P&L Range:</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '100px', height: '14px', borderRadius: '7px', background: 'linear-gradient(90deg, #EF4444 0%, #FBBF24 50%, #22C55E 100%)' }} />
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>Loss</span>
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>Profit</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', marginLeft: 'auto', fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
              <span>🟢 Profitable</span>
              <span>🔴 Loss</span>
              <span>⚪ No trades</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div style={{ overflowX: 'auto', minWidth: '100%' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(' + weeksCount + ', ' + cellSize + 'px)', 
              gap: '4px',
              minWidth: 'max-content',
            }}>
              {dayRows.map((day, dayIndex) => (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ 
                    width: cellSize * weeksCount + (weeksCount - 1) * 4, 
                    height: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    fontFamily: "'Manrope', sans-serif",
                  }}>
                    {day}
                  </div>
                  {Array.from({ length: weeksCount }).map((_, week) => {
                    const cellData = heatmapData.find(d => d.week === week && d.day === dayIndex);
                    const pnl = cellData?.pnl || 0;
                    const intensity = Math.min(Math.abs(pnl) / maxPnl, 1);
                    const isPositive = pnl >= 0;
                    
                    let bgColor;
                    if (!cellData) {
                      bgColor = 'rgba(255,255,255,0.02)';
                    } else if (isPositive) {
                      const g = Math.round(34 + intensity * (197 - 34));
                      bgColor = 'rgba(34, ' + g + ', 139, ' + (0.15 + intensity * 0.35) + ')';
                    } else {
                      const r = Math.round(239 - intensity * (239 - 180));
                      bgColor = 'rgba(' + r + ', 68, 68, ' + (0.15 + intensity * 0.35) + ')';
                    }

                    return (
                      <motion.div
                        key={week + '-' + dayIndex}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: '4px',
                          background: bgColor,
                          border: cellData ? '1px solid ' + (isPositive ? 'rgba(34,197,139,0.3)' : 'rgba(239,68,68,0.3)') : '1px solid transparent',
                          cursor: cellData ? 'pointer' : 'default',
                          transition: 'transform var(--fast) var(--ease), box-shadow var(--fast) var(--ease)',
                          position: 'relative',
                        }}
                        whileHover={{ scale: 1.15, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: week * 0.01 + dayIndex * 0.005 }}
                      >
                        {cellData && (
                          <div style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: '4px',
                            fontSize: '7.5px',
                            fontFamily: "'Manrope', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--text)',
                            pointerEvents: 'none',
                          }}>
                            <span style={{ fontWeight: 700, fontSize: '8.5px' }}>{formatPnlValue(cellData.pnl)}</span>
                            <span style={{ fontSize: '6.5px', color: 'var(--muted)' }}>{cellData.trades} trades</span>
                          </div>
                        )}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 1, 
                          left: 1, 
                          right: 1, 
                          fontSize: '5.5px', 
                          color: 'rgba(255,255,255,0.25)', 
                          fontFamily: "'Manrope', sans-serif",
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}>
                          W{week + 1}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
            <div style={{ textAlign: 'center', padding: '11px', background: 'rgba(34,197,139,0.05)', borderRadius: '11px', border: '1px solid rgba(34,197,139,0.1)' }}>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {heatmapData.filter(d => d.pnl > 0).length}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: '3px' }}>Profitable Days</div>
            </div>
            <div style={{ textAlign: 'center', padding: '11px', background: 'rgba(239,68,68,0.05)', borderRadius: '11px', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                {heatmapData.filter(d => d.pnl < 0).length}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: '3px' }}>Loss Days</div>
            </div>
            <div style={{ textAlign: 'center', padding: '11px', background: 'rgba(255,180,0,0.05)', borderRadius: '11px', border: '1px solid rgba(255,180,0,0.1)' }}>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                {heatmapData.reduce((sum, d) => sum + d.pnl, 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: '3px' }}>Net P&L</div>
            </div>
            <div style={{ textAlign: 'center', padding: '11px', background: 'rgba(168,85,247,0.05)', borderRadius: '11px', border: '1px solid rgba(168,85,247,0.1)' }}>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--purple)', fontVariantNumeric: 'tabular-nums' }}>
                {(heatmapData.reduce((sum, d) => sum + d.trades, 0) / heatmapData.length).toFixed(1)}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: '3px' }}>Avg Trades/Day</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}