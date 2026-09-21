'use client';

/* Dashboard summary table — SYMBOL / TYPE / VOL. / OPEN / CLOSE / P&L only.
   Anything else the trades table carries (strike, expiry, option type,
   timestamps) belongs on a detail page, not this quick-scan card. */

import { motion } from 'framer-motion';

function formatPnl(n) {
  if (n === null || n === undefined) return '—';
  const prefix = n >= 0 ? '+' : '−';
  return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// Real DB value only (BUY | SELL) — never invented, never relabeled.
function resolveType(side) {
  const s = typeof side === 'string' ? side.trim().toUpperCase() : '';
  if (s === 'BUY') return { label: 'BUY', color: 'var(--green)' };
  if (s === 'SELL') return { label: 'SELL', color: 'var(--red)' };
  return { label: '—', color: 'var(--muted)' };
}

const COLS = '1.3fr 0.8fr 0.8fr 1fr 1fr 1fr';

export default function RecentTradesTable({
  trades = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Trades</h3>
        </div>
        <div style={{ padding: '10px 18px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '11px 0' }}>
              {Array.from({ length: 6 }).map((__, c) => (
                <div key={c} style={{ height: 11, width: c === 0 ? '80%' : '55%', borderRadius: 5, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Trades</h3>
        </div>
        <div style={{ padding: '22px 18px 26px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No recent trades</div>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Trades you close will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Trades</h3>
        <a href="/portal/terminal" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>View All →</a>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '11px 18px',
          minWidth: 540, borderBottom: '1px solid var(--border)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          <div>Symbol</div>
          <div>Type</div>
          <div>Vol.</div>
          <div>Open</div>
          <div>Close</div>
          <div style={{ textAlign: 'right' }}>P&amp;L</div>
        </div>

        <div>
          {trades.map((trade, index) => {
            const t = resolveType(trade.side);
            return (
              <motion.div
                key={trade.id || index}
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '13px 18px',
                  minWidth: 540, alignItems: 'center',
                  borderBottom: index < trades.length - 1 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
              >
                <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {trade.symbol || '—'}
                </div>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                    color: t.color, background: t.color === 'var(--muted)' ? 'transparent' : `color-mix(in srgb, ${t.color} 14%, transparent)`,
                  }}>
                    {t.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                  {trade.qty ?? '—'}
                </div>
                <div style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                  {trade.entryPrice ? Number(trade.entryPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                </div>
                <div style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                  {trade.exitPrice ? Number(trade.exitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: trade.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatPnl(trade.pnl || 0)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
