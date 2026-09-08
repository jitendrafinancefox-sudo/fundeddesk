'use client';

import { motion } from 'framer-motion';

function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatPnl(n) {
  if (n === null || n === undefined) return '—';
  const prefix = n >= 0 ? '+' : '−';
  return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;
}

// BUY → LONG, SELL → SHORT, anything else (null / unknown) → em dash. Never invent a side.
function resolveSide(side) {
  const s = typeof side === 'string' ? side.trim().toUpperCase() : '';
  if (s === 'BUY') return { label: 'LONG', color: 'var(--green)' };
  if (s === 'SELL') return { label: 'SHORT', color: 'var(--red)' };
  return { label: '—', color: 'var(--muted)' };
}

export default function RecentTradesTable({ 
  trades = [], 
  isLoading = false,
}) {
  const parseOptionSymbol = (symbol) => {
    if (!symbol) return { underlying: '', expiry: '', strike: '', type: '' };
    
    const patterns = [
      /^(NIFTY|BANKNIFTY|FINNIFTY|SENSEX)(\d{2}[A-Z]{3}\d{2})(\d+)(CE|PE)$/i,
      /^(NIFTY|BANKNIFTY|FINNIFTY|SENSEX)\s*(\d+)\s*(CE|PE)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = symbol.match(pattern);
      if (match) {
        return {
          underlying: match[1].toUpperCase(),
          expiry: match[2] || '',
          strike: match[3] || '',
          type: match[4]?.toUpperCase() || '',
        };
      }
    }
    
    return { underlying: symbol, expiry: '', strike: '', type: '' };
  };

  const enrichedTrades = trades.map(trade => {
    const parsed = parseOptionSymbol(trade.symbol);
    return {
      ...trade,
      optionType: parsed.type || trade.option_type || trade.type || '',
      strike: parsed.strike || trade.strike || '',
      expiry: parsed.expiry || trade.expiry || '',
    };
  });

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Recent Trades</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '100px 80px 70px 90px 100px 100px 100px 100px 100px', 
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(34,197,139,0.03)',
            borderBottom: '1px solid var(--border)',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}>
            {['Symbol', 'Type', 'Side', 'Strike', 'Expiry', 'Entry', 'Exit', 'P&L', 'Time'].map((col) => (
              <div key={col} style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {col}
              </div>
            ))}
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '100px 80px 70px 90px 100px 100px 100px 100px 100px',
                gap: '16px',
                padding: '12px 16px',
                borderBottom: i < 4 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
              }}>
                {Array.from({ length: 9 }).map((__, c) => (
                  <div key={c} style={{ height: '12px', width: c === 0 ? '90%' : c > 6 ? '60%' : '70%', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!enrichedTrades.length) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Recent Trades</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: '22px' }}>📋</div>
          <h3 style={{ marginBottom: 6, fontSize: 17 }}>No recent trades</h3>
          <p className="muted" style={{ marginBottom: 18, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', fontSize: 13 }}>
            Your recent trades will appear here once you start trading.
          </p>
          <a href="/portal/terminal" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px' }}>
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
          <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
        </div>

        {/* One shared horizontal-scroll container so the header and rows scroll
            together and the wide table never spills out of / clips the card. */}
        <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 80px 70px 90px 100px 100px 100px 100px 100px',
          gap: '16px',
          padding: '12px 16px',
          background: 'rgba(34,197,139,0.03)',
          borderBottom: '1px solid var(--border)',
          fontSize: '10.5px',
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          minWidth: '840px',
        }}>
          {['Symbol', 'Type', 'Side', 'Strike', 'Expiry', 'Entry', 'Exit', 'P&L', 'Time'].map((col) => (
            <div key={col} style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {col}
            </div>
          ))}
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {enrichedTrades.map((trade, index) => (
            <motion.div
              key={trade.id || index}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 80px 70px 90px 100px 100px 100px 100px 100px',
                gap: '16px',
                padding: '12px 16px',
                borderBottom: index < enrichedTrades.length - 1 ? '1px solid rgba(34,197,139,0.06)' : 'none',
                alignItems: 'center',
                transition: 'background var(--fast) var(--ease)',
                minWidth: '840px',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.19, 1, 0.22, 1] }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {trade.symbol || '—'}
              </div>
              <div style={{ color: trade.type === 'OPTION' ? 'var(--brand)' : trade.type === 'FUTURE' ? 'var(--gold)' : 'var(--muted)', fontWeight: 600, fontSize: 12 }}>
                {trade.type || trade.optionType || '—'}
              </div>
              {(() => { const s = resolveSide(trade.side); return (
                <div style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</div>
              ); })()}
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.strike ? Number(trade.strike).toLocaleString('en-IN') : '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.expiry || '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.entryPrice ? Number(trade.entryPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                {trade.exitPrice ? Number(trade.exitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
              </div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: trade.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatPnl(trade.pnl || 0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>
                {trade.tradedAt ? new Date(trade.tradedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </motion.div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}