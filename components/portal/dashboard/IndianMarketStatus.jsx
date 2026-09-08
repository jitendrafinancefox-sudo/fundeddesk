'use client';

import { motion } from 'framer-motion';
import { IS_MARKET_OPEN } from '@/components/terminal/constants';

function formatCurrency(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return n >= 0 ? '+' + Number(n || 0).toFixed(2) + '%' : Number(n || 0).toFixed(2) + '%';
}

export default function IndianMarketStatus({ 
  isLoading = false,
  niftyData,
  bankNiftyData,
  finNiftyData,
  marketStatus,
  vix 
}) {
  const indices = [
    { key: 'nifty', name: 'NIFTY 50', symbol: '^NSEI', data: niftyData, color: 'var(--green)' },
    { key: 'banknifty', name: 'BANK NIFTY', symbol: '^NSEBANK', data: bankNiftyData, color: 'var(--gold)' },
    { key: 'finnifty', name: 'FIN NIFTY', symbol: '^NSEFIN', data: finNiftyData, color: 'var(--purple)' },
  ];

  const hasData = niftyData || bankNiftyData || finNiftyData;
  const isMarketOpen = marketStatus === 'OPEN';
  const marketHours = {
    preMarket: '9:00 AM - 9:15 AM',
    regular: '9:15 AM - 3:30 PM',
    postMarket: '3:40 PM - 4:00 PM',
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Indian Market Status</h3>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
                style={{ padding: '18px', minHeight: '130px' }}
              >
                <div style={{ height: '18px', width: '55%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '30px', width: '38%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '14px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '14px', width: '75%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </motion.div>
            ))}
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
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Indian Market Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={`tag ${IS_MARKET_OPEN() ? 'tag-green' : 'tag-red'}`} style={{ fontSize: 10.5 }}>
                {IS_MARKET_OPEN() ? '🟢 MARKET OPEN' : '🔴 MARKET CLOSED'}
              </span>
              <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
              </span>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: '22px' }}>📊</div>
          <h3 style={{ marginBottom: 6, fontSize: 17 }}>Market data unavailable</h3>
          <p className="muted" style={{ marginBottom: 18, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', fontSize: 13 }}>
            Unable to fetch live market data. Check your connection or try again later.
          </p>
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '11px', border: '1px solid var(--border)', display: 'inline-block' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Market Hours</div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--muted)' }}>Pre: {marketHours.preMarket}</span>
              <span style={{ color: IS_MARKET_OPEN() ? 'var(--green)' : 'var(--text)' }}>Regular: {marketHours.regular}</span>
              <span style={{ color: 'var(--muted)' }}>Post: {marketHours.postMarket}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Indian Market Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`tag ${IS_MARKET_OPEN() ? 'tag-green' : 'tag-red'}`} style={{ fontSize: 10.5 }}>
              {IS_MARKET_OPEN() ? '🟢 MARKET OPEN' : '🔴 MARKET CLOSED'}
            </span>
            <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {indices.map((index, i) => {
          const d = index.data;
          const hasIndexData = !!d;
          const change = hasIndexData ? (d.change ?? 0) : 0;
          const changePercent = hasIndexData ? (d.changePercent ?? 0) : 0;
          const lastPrice = hasIndexData ? (d.lastPrice ?? 0) : 0;
          
          return (
            <motion.div
              key={index.key}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.19, 1, 0.22, 1] }}
              style={{ 
                padding: '18px', 
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                opacity: hasIndexData ? 1 : 0.5,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,197,139,0.03) 0%, transparent 50%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '11px', 
                    background: index.key === 'nifty' ? 'rgba(34,197,139,0.15)' : index.key === 'banknifty' ? 'rgba(255,180,0,0.15)' : 'rgba(168,85,247,0.15)',
                    display: 'grid', 
                    placeItems: 'center', 
                    fontSize: '18px',
                    border: '1px solid ' + (index.key === 'nifty' ? 'rgba(34,197,139,0.3)' : index.key === 'banknifty' ? 'rgba(255,180,0,0.3)' : 'rgba(168,85,247,0.3)'),
                  }}>
                    {index.key === 'nifty' ? '📊' : index.key === 'banknifty' ? '🏦' : '💰'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: hasIndexData ? 'var(--text)' : 'var(--muted)', fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.01em' }}>
                      {index.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
                      {index.symbol}
                    </div>
                  </div>
                  {!hasIndexData && (
                    <span className="tag tag-muted" style={{ fontSize: 9.5, marginLeft: 'auto' }}>NO DATA</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(20px, 2.8vw, 26px)', lineHeight: 1, color: hasIndexData ? 'var(--text)' : 'var(--muted)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {hasIndexData ? formatCurrency(lastPrice) : '—'}
                  </div>
                  {hasIndexData && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      padding: '3px 9px',
                      borderRadius: '99px',
                      background: change >= 0 ? 'rgba(34,197,139,0.12)' : 'rgba(239,68,68,0.12)',
                      border: '1px solid ' + (change >= 0 ? 'rgba(34,197,139,0.3)' : 'rgba(239,68,68,0.3)'),
                    }}>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        fontFamily: "'Manrope', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                        color: change >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {change >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(change))}
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        fontFamily: "'Manrope', sans-serif",
                        fontVariantNumeric: 'tabular-nums',
                        color: change >= 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        ({formatPct(changePercent)})
                      </span>
                    </div>
                  )}
                </div>

                {hasIndexData && (
                  <div style={{ display: 'flex', gap: '20px', fontSize: '11.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '10px', letterSpacing: '.05em', textTransform: 'uppercase' }}>HIGH</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(d.high)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '10px', letterSpacing: '.05em', textTransform: 'uppercase' }}>LOW</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(d.low)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '10px', letterSpacing: '.05em', textTransform: 'uppercase' }}>OPEN</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(d.open)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '10px', letterSpacing: '.05em', textTransform: 'uppercase' }}>PREV CLOSE</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(d.prevClose)}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'rgba(34,197,139,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Market Hours</span>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: 'var(--muted)' }}>Pre: {marketHours.preMarket}</span>
              <span style={{ color: IS_MARKET_OPEN() ? 'var(--green)' : 'var(--text)' }}>Regular: {marketHours.regular}</span>
              <span style={{ color: 'var(--muted)' }}>Post: {marketHours.postMarket}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>India VIX</span>
            <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(18px, 2.2vw, 23px)', color: vix && vix > 20 ? 'var(--red)' : vix && vix > 15 ? 'var(--gold)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
              {vix ? vix + '%' : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}