'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Sample payout data - replace with real API data when available
const SAMPLE_PAYOUTS = [
  { id: 'TRD••4821', account: '₹5L Account', amount: '₹42,500', status: 'PAID', time: '2h ago' },
  { id: 'TRD••9173', account: '₹10L Account', amount: '₹81,200', status: 'PAID', time: '5h ago' },
  { id: 'TRD••2456', account: '₹2L Account', amount: '₹18,750', status: 'PAID', time: '12h ago' },
  { id: 'TRD••7391', account: '₹5L Account', amount: '₹35,800', status: 'PAID', time: '1d ago' },
  { id: 'TRD••1128', account: '₹2L Account', amount: '₹22,400', status: 'PAID', time: '2d ago' },
  { id: 'TRD••5634', account: '₹10L Account', amount: '₹95,600', status: 'PAID', time: '3d ago' },
  { id: 'TRD••8923', account: '₹5L Account', amount: '₹48,900', status: 'PROCESSING', time: '3h ago' },
  { id: 'TRD••3347', account: '₹2L Account', amount: '₹15,200', status: 'PENDING', time: '1h ago' },
];

export default function PayoutFeed() {
  const [payouts, setPayouts] = useState(SAMPLE_PAYOUTS);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPayouts(prev => {
        if (Math.random() < 0.3) {
          const newPayout = {
            id: `TRD••${Math.floor(Math.random() * 9000 + 1000)}`,
            account: ['₹2L Account', '₹5L Account', '₹10L Account'][Math.floor(Math.random() * 3)],
            amount: `₹${(Math.random() * 80000 + 15000).toLocaleString('en-IN')}`,
            status: ['PAID', 'PAID', 'PAID', 'PROCESSING', 'PENDING'][Math.floor(Math.random() * 5)],
            time: 'just now',
          };
          return [newPayout, ...prev.slice(0, 9)];
        }
        return prev;
      });
    }, 8000);

    setTimeout(() => setIsAnimating(false), 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PAID':
        return { background: 'rgba(34,197,139,0.12)', color: 'var(--brand)', border: '1px solid rgba(34,197,139,0.2)' };
      case 'PROCESSING':
        return { background: 'rgba(245,185,62,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,185,62,0.2)' };
      case 'PENDING':
        return { background: 'rgba(240,82,95,0.1)', color: 'var(--red)', border: '1px solid rgba(240,82,95,0.2)' };
      default:
        return { background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' };
    }
  };

  function RenderRow({ payout, index }) {
    return (
      <motion.div
        key={payout.id}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr',
          padding: '14px 24px',
          borderBottom: index < 9 ? '1px solid rgba(34,197,139,0.06)' : 'none',
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
          {payout.id}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{payout.account}</div>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: 'var(--text)' }}>
          {payout.amount}
        </div>
        <div>
          <span style={{
            ...(payout.status === 'PAID' ? { background: 'rgba(34,197,139,0.12)', color: 'var(--brand)', border: '1px solid rgba(34,197,139,0.2)' } :
              payout.status === 'PROCESSING' ? { background: 'rgba(245,185,62,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,185,62,0.2)' } :
              payout.status === 'PENDING' ? { background: 'rgba(240,82,95,0.1)', color: 'var(--red)', border: '1px solid rgba(240,82,95,0.2)' } :
              { background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' }),
            padding: '4px 10px',
            borderRadius: '99px',
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {payout.status === 'PROCESSING' && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'currentColor',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            )}
            {payout.status === 'PENDING' && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: 'currentColor',
                animation: 'spin 1s linear infinite',
              }} />
            )}
            {payout.status}
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          {payout.time}
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ 
      background: 'rgba(4,8,6,0.3)', 
      border: '1px solid var(--border)', 
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid var(--border)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: 'var(--brand)', 
            boxShadow: '0 0 12px var(--brand-glow)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span className="label" style={{ textTransform: 'uppercase' }}>LIVE PAYOUT FEED</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--muted)' }}>
          <span>Auto-refresh: ON</span>
          <span style={{ color: 'var(--brand)' }}>●</span>
          <span>Sample data</span>
        </div>
      </div>

      {/* Table Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr', 
        padding: '12px 24px',
        background: 'rgba(34,197,139,0.03)',
        borderBottom: '1px solid var(--border)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        <div>TRADER</div>
        <div>ACCOUNT</div>
        <div>PAYOUT</div>
        <div>STATUS</div>
        <div>TIME</div>
      </div>

      {/* Payout Rows */}
      <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
        {SAMPLE_PAYOUTS.map((payout, index) => (
          <motion.div
            key={payout.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr',
              padding: '14px 24px',
              borderBottom: index < SAMPLE_PAYOUTS.length - 1 ? '1px solid rgba(34,197,139,0.06)' : 'none',
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
              {payout.id}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{payout.account}</div>
            <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: 'var(--text)' }}>
              {payout.amount}
            </div>
            <div>
              <span style={{
                ...(payout.status === 'PAID' ? { background: 'rgba(34,197,139,0.12)', color: 'var(--brand)', border: '1px solid rgba(34,197,139,0.2)' } :
                  payout.status === 'PROCESSING' ? { background: 'rgba(245,185,62,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,185,62,0.2)' } :
                  payout.status === 'PENDING' ? { background: 'rgba(240,82,95,0.1)', color: 'var(--red)', border: '1px solid rgba(240,82,95,0.2)' } :
                  { background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' }),
                padding: '4px 10px',
                borderRadius: '99px',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {payout.status === 'PROCESSING' && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'currentColor',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                )}
                {payout.status === 'PENDING' && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'currentColor',
                    animation: 'spin 1s linear infinite',
                  }} />
                )}
                {payout.status}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
              {payout.time}
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}