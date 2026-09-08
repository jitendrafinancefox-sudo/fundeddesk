'use client';

import { motion } from 'framer-motion';

function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatPnl(n) {
  if (n === null || n === undefined) return '—';
  const prefix = n >= 0 ? '+' : '−';
  return prefix + '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return (n >= 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%';
}

export default function RecentTrades({ 
  trades = [], 
  isLoading = false,
  onViewAll 
}) {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Recent Trades</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '100px 80px 70px 100px 100px 100px 100px 100px', 
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(34,197,139,0.03)',
            borderBottom: '1px solid var(--border)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}>
            {['Symbol', 'Type', 'Side', 'Entry', 'Exit', 'P&L', 'P&L %', 'Time'].map((col) => (
              <div key={col} style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {col}
              </div>
            ))}
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ 
                display: 'grid', 
                gridTemplateColumns: '100px 80px 70px 100px 100px 100px 100px 100px', 
                gap: '16px',
                padding: '14px 16px',
                borderBottom: i < 4 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
                opacity: 0.4,
              }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>NIFTY 24500 CE</div>
                <div style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 12.5 }}>OPTION</div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12.5 }}>LONG</div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>24,850.00</div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>24,875.50</div>
                <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>+₹637.50</div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>+1.28%</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>10:32 AM</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Recent Trades</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: '24px' }}>📋</div>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>No recent trades</h3>
          <p className="muted" style={{ marginBottom: 20, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Your recent trades will appear here once you start trading.
          </p>
          <a href="/portal/terminal" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
            Open Terminal →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Recent Trades</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
            {onViewAll && (
              <button onClick={onViewAll} className="btn btn-ghost btn-sm" style={{ padding: '6px 12px', fontSize: 12.5 }}>
                View All Trades
              </button>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '100px 80px 70px 100px 100px 100px 100px 100px', 
          gap: '16px',
          padding: '12px 16px',
          background: 'rgba(34,197,139,0.03)',
          borderBottom: '1px solid var(--border)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          {['Symbol', 'Type', 'Side', 'Entry', 'Exit', 'P&L', 'P&L %', 'Time'].map((col) => (
            <div key={col} style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {col}
            </div>
          ))}
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id || index}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 80px 70px 100px 100px 100px 100px 100px',
                gap: '16px',
                padding: '14px 16px',
                borderBottom: index < trades.length - 1 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
                transition: 'background var(--fast) var(--ease)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.19, 1, 0.22, 1] }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                {trade.symbol}
              </div>
              <div style={{ color: trade.type === 'OPTION' ? 'var(--brand)' : trade.type === 'FUTURE' ? 'var(--gold)' : 'var(--text)', fontWeight: 600, fontSize: 12.5 }}>
                {trade.type}
              </div>
              <div style={{ color: trade.side === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12.5 }}>
                {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.entryPrice ? '₹' + Number(trade.entryPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.exitPrice ? '₹' + Number(trade.exitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: trade.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {trade.pnl >= 0 ? '+' : '−'}₹{Math.abs(trade.pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: (trade.pnlPct || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {(trade.pnlPct || 0) >= 0 ? '+' : ''}{(trade.pnlPct || 0).toFixed(2)}%
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>
                {trade.tradedAt ? new Date(trade.tradedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}