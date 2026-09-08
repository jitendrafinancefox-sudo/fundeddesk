'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function MarketSession({ isLoading = false }) {
  const [marketState, setMarketState] = useState({
    session: 'closed',
    timeUntilNext: null,
    currentTime: new Date(),
  });

  useEffect(() => {
    const updateMarketState = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      const day = istTime.getUTCDay();
      const totalMinutes = hours * 60 + minutes;

      const preMarketStart = 9 * 60;
      const marketOpen = 9 * 60 + 15;
      const marketClose = 15 * 60 + 30;
      const postMarketEnd = 16 * 60;

      let session = 'closed';
      let timeUntilNext = null;

      const isWeekend = day === 0 || day === 6;

      if (isWeekend) {
        session = 'weekend';
        const daysUntilMonday = day === 0 ? 1 : 2;
        const nextOpen = new Date(istTime);
        nextOpen.setUTCDate(istTime.getUTCDate() + daysUntilMonday);
        nextOpen.setUTCHours(9, 15, 0, 0);
        timeUntilNext = nextOpen.getTime() - istTime.getTime();
      } else if (totalMinutes < preMarketStart) {
        session = 'pre-market';
        timeUntilNext = (preMarketStart - totalMinutes) * 60 * 1000;
      } else if (totalMinutes < marketOpen) {
        session = 'pre-market';
        timeUntilNext = (marketOpen - totalMinutes) * 60 * 1000;
      } else if (totalMinutes < marketClose) {
        session = 'open';
        timeUntilNext = (marketClose - totalMinutes) * 60 * 1000;
      } else if (totalMinutes < postMarketEnd) {
        session = 'post-market';
        timeUntilNext = (postMarketEnd - totalMinutes) * 60 * 1000;
      } else {
        session = 'closed';
        const nextOpen = new Date(istTime);
        nextOpen.setUTCDate(istTime.getUTCDate() + (day === 5 ? 3 : 1));
        nextOpen.setUTCHours(9, 15, 0, 0);
        timeUntilNext = nextOpen.getTime() - istTime.getTime();
      }

      setMarketState({
        session,
        timeUntilNext,
        currentTime: now,
      });
    };

    updateMarketState();
    const interval = setInterval(updateMarketState, 1000);
    return () => clearInterval(interval);
  }, []);

  const sessionConfig = {
    open: { label: 'LIVE', color: 'var(--green)', bg: 'rgba(34,197,139,0.12)', border: 'rgba(34,197,139,0.3)', icon: '●' },
    'pre-market': { label: 'PRE-MARKET', color: 'var(--gold)', bg: 'rgba(245,185,62,0.12)', border: 'rgba(245,185,62,0.3)', icon: '◇' },
    'post-market': { label: 'POST-MARKET', color: 'var(--blue)', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '◇' },
    closed: { label: 'CLOSED', color: 'var(--red)', bg: 'rgba(240,82,95,0.12)', border: 'rgba(240,82,95,0.3)', icon: '○' },
    weekend: { label: 'WEEKEND', color: 'var(--muted)', bg: 'rgba(140,168,150,0.12)', border: 'rgba(140,168,150,0.3)', icon: '○' },
  };

  const config = sessionConfig[marketState.session] || sessionConfig.closed;

  const formatTimeUntil = (ms) => {
    if (!ms || ms <= 0) return '—';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Market Session</h3>
        </div>
        <div style={{ padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Loading market session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Market Session</h3>
      </div>
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '9px',
            padding: '9px 14px',
            borderRadius: '99px',
            background: config.bg,
            border: `1px solid ${config.border}`,
          }}>
            <span style={{ 
              fontSize: '15px',
              color: config.color,
              animation: marketState.session === 'open' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}>
              {config.icon}
            </span>
            <span style={{ 
              fontSize: '10.5px', 
              fontWeight: 700, 
              letterSpacing: '.1em', 
              textTransform: 'uppercase',
              color: config.color,
              fontFamily: "'Manrope', sans-serif",
            }}>
              {config.label}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
            {marketState.currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })} IST
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '14px', background: 'rgba(34,197,139,0.03)', borderRadius: '11px', border: '1px solid rgba(34,197,139,0.1)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>Indian Market Hours</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: marketState.session === 'pre-market' ? 'var(--gold)' : marketState.session === 'open' ? 'var(--text)' : 'var(--muted)' }}>Pre-Market: 09:00 – 09:15</span>
              <span style={{ color: marketState.session === 'open' ? 'var(--green)' : 'var(--text)', fontWeight: 600 }}>Regular: 09:15 – 15:30</span>
              <span style={{ color: marketState.session === 'post-market' ? 'var(--blue)' : 'var(--muted)' }}>Post-Market: 15:40 – 16:00</span>
            </div>
          </div>
          <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '11px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>
              {marketState.session === 'open' ? 'Closes In' : marketState.session === 'pre-market' ? 'Opens In' : 'Next Session In'}
            </div>
            <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(22px, 2.8vw, 28px)', color: config.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {formatTimeUntil(marketState.timeUntilNext)}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}