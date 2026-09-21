'use client';

import { motion } from 'framer-motion';

export default function OpenPositionsTable({ 
  positions = [], 
  isLoading = false,
}) {
  const formatCurrency = (n) => {
    if (n === null || n === undefined) return '—';
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };
  
  const formatNumber = (n) => Number(n || 0).toLocaleString('en-IN');
  
  const formatPnl = (n) => {
    if (n === null || n === undefined) return '—';
    const prefix = n >= 0 ? '+' : '−';
    return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };
  
  const formatPct = (n) => {
    if (n === null || n === undefined) return '—';
    return `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;
  };

  // BUY → LONG, SELL → SHORT, anything else (null / unknown) → em dash. Never invent a side.
  const resolveSide = (side) => {
    const s = typeof side === 'string' ? side.trim().toUpperCase() : '';
    if (s === 'BUY') return { label: 'LONG', color: 'var(--green)' };
    if (s === 'SELL') return { label: 'SHORT', color: 'var(--red)' };
    return { label: '—', color: 'var(--muted)' };
  };

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

  const getPositionType = (pos) => {
    if (pos.kind === 'option') return 'OPTION';
    if (pos.kind === 'future') return 'FUTURE';
    if (pos.kind === 'stock') return 'EQUITY';
    return pos.kind?.toUpperCase() || 'UNKNOWN';
  };

  const enrichedPositions = positions.map(pos => {
    const parsed = parseOptionSymbol(pos.symbol);
    return {
      ...pos,
      optionType: parsed.type || (pos.option_type || ''),
      strike: parsed.strike || pos.strike || '',
      expiry: parsed.expiry || pos.expiry || '',
      underlying: parsed.underlying || pos.underlying || '',
    };
  });

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Open Positions</h3>
            <span className="tag tag-blue" style={{ fontSize: 11 }}>LIVE</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '140px 70px 80px 100px 100px 100px 100px 110px 90px 80px', 
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid var(--border)',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}>
            {['Symbol', 'Type', 'Side', 'Strike', 'Expiry', 'Qty', 'Entry', 'Current', 'P&L', 'P&L %'].map((col) => (
              <div key={col} style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {col}
              </div>
            ))}
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '140px 70px 80px 100px 100px 100px 100px 110px 90px 80px',
                gap: '16px',
                padding: '12px 16px',
                borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
              }}>
                {Array.from({ length: 10 }).map((__, c) => (
                  <div key={c} style={{ height: '12px', width: c === 0 ? '90%' : '65%', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!enrichedPositions.length) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Open Positions</h3>
          <span className="tag tag-blue" style={{ fontSize: 10 }}>LIVE</span>
        </div>
        <div style={{ padding: '22px 18px 26px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No open positions</div>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Trades you currently have running appear here.
          </p>
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
        <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
          {enrichedPositions.length} position{enrichedPositions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* One shared horizontal-scroll container so the header and rows scroll
          together and the wide table never spills out of / clips the card. */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 70px 80px 100px 100px 100px 100px 110px 90px 80px',
          gap: '16px',
          padding: '12px 20px',
          fontSize: '10.5px',
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          borderBottom: '1px solid var(--border)',
          minWidth: '970px',
        }}>
          {['Symbol', 'Type', 'Side', 'Strike', 'Expiry', 'Qty', 'Entry', 'Current', 'P&L', 'P&L %'].map((col) => (
            <div key={col} style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {col}
            </div>
          ))}
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {enrichedPositions.map((pos, index) => (
          <motion.div
            key={pos.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.19, 1, 0.22, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 70px 80px 100px 100px 100px 100px 110px 90px 80px',
              gap: '16px',
              padding: '12px 20px',
              borderBottom: index < enrichedPositions.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              transition: 'background var(--fast) var(--ease)',
              minWidth: '970px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pos.symbol || '—'}
            </div>
            <span className={`tag ${pos.kind === 'option' ? 'tag-brand' : pos.kind === 'future' ? 'tag-gold' : 'tag-muted'}`} style={{ fontSize: 10 }}>{pos.kind?.toUpperCase() || 'UNKNOWN'}</span>
            {(() => { const s = resolveSide(pos.side); return (
              <span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</span>
            ); })()}
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
              {pos.strike ? Number(pos.strike).toLocaleString('en-IN') : '—'}
            </div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
              {pos.expiry || '—'}
            </div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{Number(pos.qty || 0).toLocaleString('en-IN')}</div>
            <div style={{ color: 'var(--text)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{formatCurrency(pos.avgPrice || pos.entry_price || 0)}</div>
            <div style={{ color: 'var(--text)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontFamily: 'Manrope, sans-serif' }}>{formatCurrency(pos.currentPrice || pos.avgPrice || pos.entry_price || 0)}</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: (pos.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatPnl(pos.pnl || 0)}
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12, fontFamily: 'Manrope, sans-serif', color: (pos.pnlPct || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatPct(pos.pnlPct || 0)}
            </div>
          </motion.div>
        ))}
        </div>
      </div>
    </div>
  );
}