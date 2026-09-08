'use client';

import { motion } from 'framer-motion';

export default function OpenPositions({ 
  positions = [], 
  isLoading = false,
  onClosePosition,
  onModifyPosition 
}) {
  const formatCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');
  const formatPnl = (n) => {
    if (n === null || n === undefined) return '—';
    const prefix = n >= 0 ? '+' : '−';
    return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };
  const formatPct = (n) => `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;

  const getPositionType = (pos) => {
    if (pos.kind === 'option') return 'OPTION';
    if (pos.kind === 'future') return 'FUTURE';
    if (pos.kind === 'stock') return 'EQUITY';
    return pos.kind?.toUpperCase() || 'UNKNOWN';
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Open Positions</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '120px 80px 70px 100px 100px 100px 110px 90px 80px 80px 90px', 
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
            {['Symbol', 'Type', 'Side', 'Quantity', 'Entry', 'Current', 'P&L', 'P&L %', 'SL', 'TP', 'Margin'].map((col) => (
              <div key={col} style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {col}
              </div>
            ))}
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ 
                display: 'grid', 
                gridTemplateColumns: '120px 80px 70px 100px 100px 100px 110px 90px 80px 80px 90px', 
                gap: '16px',
                padding: '14px 16px',
                borderBottom: i < 4 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
                opacity: 0.4,
              }}>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>NIFTY 24500 CE</div>
                <div className="tag tag-brand" style={{ fontSize: 10.5 }}>OPTION</div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12.5 }}>LONG</div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>25</div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>24,850.00</div>
                <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>24,875.50</div>
                <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>+₹637.50</div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>+1.28%</div>
                <div style={{ color: 'var(--red)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>24,600</div>
                <div style={{ color: 'var(--green)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>25,100</div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>₹6,250</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!positions.length) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Open Positions</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: '24px' }}>📭</div>
          <h3 style={{ marginBottom: 8, fontSize: 18 }}>No open positions</h3>
          <p className="muted" style={{ marginBottom: 20, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            You don't have any open positions yet. Open the terminal to start trading.
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
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Open Positions</h3>
          <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '120px 80px 70px 100px 100px 100px 110px 90px 80px 80px 90px', 
          gap: '16px',
          padding: '12px 16px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--line)',
        }}>
          {['Symbol', 'Type', 'Side', 'Quantity', 'Entry', 'Current', 'P&L', 'P&L %', 'SL', 'TP', 'Margin'].map((col) => (
            <div key={col} style={{ fontWeight: 700, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {col}
            </div>
          ))}
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {positions.map((pos, index) => (
            <motion.div
              key={pos.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.19, 1, 0.22, 1] }}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 80px 70px 100px 100px 100px 110px 90px 80px 80px 90px',
                gap: '16px',
                padding: '14px 16px',
                borderBottom: index < positions.length - 1 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
                transition: 'background var(--fast) var(--ease)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pos.symbol}
              </div>
              <span className={`tag ${pos.kind === 'option' ? 'tag-brand' : pos.kind === 'future' ? 'tag-gold' : 'tag-muted'}`} style={{ fontSize: 10.5 }}>{pos.kind?.toUpperCase() || 'UNKNOWN'}</span>
              <span style={{ color: pos.side === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12.5 }}>{pos.side === 'BUY' ? 'LONG' : 'SHORT'}</span>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{Number(pos.qty || 0).toLocaleString('en-IN')}</div>
              <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{Number(pos.avgPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div style={{ color: 'var(--text)', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{Number(pos.currentPrice || pos.avgPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: (pos.currentPrice || pos.avgPrice) >= (pos.avgPrice || 0) ? 'var(--green)' : 'var(--red)' }}>
                {pos.pnl >= 0 ? '+' : ''}{Number(pos.pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12.5, fontFamily: 'Manrope, sans-serif', color: (pos.pnlPct || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {Number(pos.pnlPct || 0) >= 0 ? '+' : ''}{Number(pos.pnlPct || 0).toFixed(2)}%
              </div>
              <div style={{ color: 'var(--red)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{pos.sl ? Number(pos.sl).toLocaleString('en-IN') : '—'}</div>
              <div style={{ color: 'var(--green)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{pos.tp ? Number(pos.tp).toLocaleString('en-IN') : '—'}</div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{Number(pos.margin || 0).toLocaleString('en-IN')}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}