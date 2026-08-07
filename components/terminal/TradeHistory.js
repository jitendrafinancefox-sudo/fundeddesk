'use client';
import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useTradeState, fmtINR } from '@/stores/TradingStore';
import { th, td, fmtNum, fmtQty, Pnl, Side, field } from './tradingUI';

const RANGES = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

// Trade History — closed trades with date/symbol/result filters, win-rate
// summary and one-click CSV export.
export default function TradeHistory() {
  const trades = useTradeState('trades');
  const [range, setRange] = useState('all');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = range === 'today' ? startOfDay() : range === '7d' ? Date.now() - 7 * 864e5 : range === '30d' ? Date.now() - 30 * 864e5 : 0;
    return trades.filter((t) => {
      if (cutoff && t.ts < cutoff) return false;
      if (q && !String(t.symbol).toLowerCase().includes(q)) return false;
      if (result === 'win' && t.pnl <= 0) return false;
      if (result === 'loss' && t.pnl >= 0) return false;
      return true;
    });
  }, [trades, range, query, result]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const wins = filtered.filter((t) => t.pnl > 0);
    const losses = filtered.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = losses.reduce((s, t) => s + t.pnl, 0);
    const net = filtered.reduce((s, t) => s + t.pnl, 0);
    return {
      total: filtered.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / filtered.length) * 100,
      grossProfit,
      grossLoss,
      net,
    };
  }, [filtered]);

  const exportCSV = () => {
    const rows = filtered.map((t) => ({
      Time: new Date(t.ts).toLocaleString('en-IN'),
      Symbol: t.symbol,
      Side: t.side,
      Qty: t.qty,
      Entry: t.entry,
      Exit: t.exit,
      PnL: t.pnl.toFixed(2),
      PnLPct: t.pnlPct != null ? t.pnlPct.toFixed(2) : '',
      Reason: t.reason,
    }));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #e0e3eb', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: '#787b86', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Filters</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Search size={11} color="#b2b5be" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Symbol"
            style={{ ...field, width: 140 }}
          />
        </span>
        {/* Date */}
        <span style={{ display: 'flex', gap: 3 }}>
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              padding: '3px 9px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: range === r.id ? 'rgba(41,98,255,0.1)' : 'transparent',
              color: range === r.id ? '#2962ff' : '#787b86',
            }}>{r.label}</button>
          ))}
        </span>
        {/* Result */}
        <span style={{ display: 'flex', gap: 3 }}>
          {[['all', 'All'], ['win', 'Win'], ['loss', 'Loss']].map(([id, label]) => (
            <button key={id} onClick={() => setResult(id)} style={{
              padding: '3px 9px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: result === id ? 'rgba(38,166,154,0.12)' : 'transparent',
              color: result === id ? '#26a69a' : '#787b86',
            }}>{label}</button>
          ))}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={exportCSV} style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          border: '1px solid #2962ff', background: '#2962ff', color: '#ffffff',
          display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter, sans-serif',
        }}>
          Export CSV
        </button>
      </div>

      {/* Summary chips */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, padding: '7px 12px', borderBottom: '1px solid #e0e3eb', flexShrink: 0, fontSize: 11 }}>
          <Chip label="Trades" value={stats.total} />
          <Chip label="Wins" value={stats.wins} color="#26a69a" />
          <Chip label="Losses" value={stats.losses} color="#ef5350" />
          <Chip label="Win rate" value={`${stats.winRate.toFixed(0)}%`} color={stats.winRate >= 50 ? '#26a69a' : '#f2994a'} />
          <Chip label="Gross profit" value={fmtINR(stats.grossProfit)} color="#26a69a" />
          <Chip label="Gross loss" value={fmtINR(stats.grossLoss)} color="#ef5350" />
          <Chip label="Net P&L" value={fmtINR(stats.net)} color={stats.net >= 0 ? '#26a69a' : '#ef5350'} bold />
        </div>
      )}

      {filtered.length ? (
        <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={th}>Time</th>
                <th style={th}>Symbol</th>
                <th style={th}>Side</th>
                <th style={{ ...th, textAlign: 'right' }}>Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Entry</th>
                <th style={{ ...th, textAlign: 'right' }}>Exit</th>
                <th style={{ ...th, textAlign: 'right' }}>PnL</th>
                <th style={{ ...th, textAlign: 'right' }}>PnL %</th>
                <th style={th}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ ...td, color: '#787b86' }}>{t.time}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.symbol}</td>
                  <td style={td}><Side side={t.side} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtQty(t.qty)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(t.entry)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(t.exit)}</td>
                  <td style={{ ...td, textAlign: 'right' }}><Pnl value={t.pnl} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ color: t.pnl >= 0 ? '#26a69a' : '#ef5350' }}>{t.pnlPct >= 0 ? '+' : ''}{fmtNum(t.pnlPct)}%</span>
                  </td>
                  <td style={{ ...td, color: '#787b86', fontWeight: 600 }}>{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 26, textAlign: 'center', color: '#787b86', fontSize: 11 }}>
          <ScrollText size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
          No trades match the current filters.
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, color, bold }) {
  return (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ color: '#787b86', fontSize: 10 }}>{label}</span>
      <b style={{ color: color || '#222222', fontWeight: bold ? 700 : 600, fontVariantNumeric: 'tabular-nums' }}>{value}</b>
    </span>
  );
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}