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
    { key: 'nifty', name: 'NIFTY 50', symbol: '^NSEI', data: niftyData, icon: '📊' },
    { key: 'banknifty', name: 'BANK NIFTY', symbol: '^NSEBANK', data: bankNiftyData, icon: '🏦' },
    { key: 'finnifty', name: 'FIN NIFTY', symbol: '^NSEFIN', data: finNiftyData, icon: '💰' },
  ];

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Indian Market Status</h3>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
                style={{ padding: '14px', minHeight: '104px' }}
              >
                <div style={{ height: '20px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '32px', width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ height: '16px', width: '80%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const marketHours = {
    preMarket: '9:00 AM - 9:15 AM',
    regular: '9:15 AM - 3:30 PM',
    postMarket: '3:40 PM - 4:00 PM',
  };

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Indian Market Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={'tag ' + (IS_MARKET_OPEN() ? 'tag-green' : 'tag-red')} style={{ fontSize: 11 }}>
              {IS_MARKET_OPEN() ? '🟢 MARKET OPEN' : '🔴 MARKET CLOSED'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
            </span>
          </div>
        </div>

        <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {indices.map((index, i) => (
            <motion.div
              key={index.key}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: [0.19, 1, 0.22, 1] }}
              style={{ 
                padding: '14px',
                minHeight: '104px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(34,197,139,0.03) 0%, transparent 50%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: index.key === 'nifty' ? 'rgba(34,197,139,0.15)' : index.key === 'banknifty' ? 'rgba(255,180,0,0.15)' : 'rgba(168,85,247,0.15)',
                    display: 'grid', 
                    placeItems: 'center', 
                    fontSize: '20px',
                    border: '1px solid ' + (index.key === 'nifty' ? 'rgba(34,197,139,0.3)' : index.key === 'banknifty' ? 'rgba(255,180,0,0.3)' : 'rgba(168,85,247,0.3)'),
                  }}>
                    {index.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.01em' }}>
                      {index.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
                      {index.symbol}
                    </div>
                  </div>
                </div>

                {Number.isFinite(Number(index.data?.lastPrice)) ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(20px, 2.6vw, 26px)', lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(index.data.lastPrice)}
                      </div>
                      {Number.isFinite(Number(index.data?.change)) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 9px',
                          borderRadius: '99px',
                          background: index.data.change >= 0 ? 'rgba(34,197,139,0.12)' : 'rgba(239,68,68,0.12)',
                          border: '1px solid ' + (index.data.change >= 0 ? 'rgba(34,197,139,0.3)' : 'rgba(239,68,68,0.3)'),
                        }}>
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            fontFamily: "'Manrope', sans-serif",
                            fontVariantNumeric: 'tabular-nums',
                            color: index.data.change >= 0 ? 'var(--green)' : 'var(--red)',
                          }}>
                            {index.data.change >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(index.data.change))}
                          </span>
                          {Number.isFinite(Number(index.data?.changePercent)) && (
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              fontFamily: "'Manrope', sans-serif",
                              fontVariantNumeric: 'tabular-nums',
                              color: index.data.change >= 0 ? 'var(--green)' : 'var(--red)',
                            }}>
                              ({formatPct(index.data.changePercent)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", flexWrap: 'wrap' }}>
                      {[['HIGH', index.data?.high], ['LOW', index.data?.low], ['OPEN', index.data?.open], ['PREV CLOSE', index.data?.prevClose]].map(([lbl, v]) => (
                        <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '10.5px', letterSpacing: '.05em', textTransform: 'uppercase' }}>{lbl}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(Number(v)) ? formatCurrency(v) : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0 2px', color: 'var(--muted)', fontSize: '12px', fontFamily: "'Manrope', sans-serif" }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0 }} />
                    Market data unavailable
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'rgba(34,197,139,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Market Hours</span>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: 'var(--text)' }}>Pre: {marketHours.preMarket}</span>
                <span style={{ color: IS_MARKET_OPEN() ? 'var(--green)' : 'var(--text)' }}>Regular: {marketHours.regular}</span>
                <span style={{ color: 'var(--muted)' }}>Post: {marketHours.postMarket}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>India VIX</span>
              {Number.isFinite(Number(vix)) ? (
                <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(20px, 2.5vw, 26px)', color: vix > 20 ? 'var(--red)' : vix > 15 ? 'var(--gold)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                  {vix}%
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>Unavailable</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}