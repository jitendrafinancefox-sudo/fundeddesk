'use client';

import { motion } from 'framer-motion';
import { Bell, RefreshCw } from 'lucide-react';

export default function DashboardHeader({ 
  account,
  plan,
  marketStatus,
  vix,
  profile,
}) {
  if (!account || !plan) {
    return (
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 0 6px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
            style={{
              fontSize: 'clamp(20px, 2.5vw, 26px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: '2px',
              fontFamily: "'Unbounded', 'Manrope', sans-serif",
              lineHeight: 1.15,
            }}
          >
            Dashboard
          </motion.h1>
        </div>
      </motion.header>
    );
  }

  const cap = plan.capital || 1000000;
  const equity = account.equity || cap;
  const profitPct = ((equity - cap) / cap) * 100;
  const isMarketOpen = marketStatus === 'OPEN';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 0 6px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: Account Context */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '12px',
            color: '#040806',
            flexShrink: 0,
          }}>
            {(account.login_id || 'T')[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              {account.login_id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 11 }}>
              <span className={`tag ${plan.plan_type === 'TWO_STEP' ? 'tag-blue' : plan.plan_type === 'ONE_STEP' ? 'tag-green' : 'tag-purple'}`} style={{ fontSize: 8.5 }}>
                {plan.plan_type}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {plan.plan_type === 'TWO_STEP' ? (account.phase === 'phase1' ? 'Phase 1' : account.phase === 'phase2' ? 'Phase 2' : 'Funded') : plan.plan_type === 'ONE_STEP' ? 'Challenge' : 'Instant Fund'}
              </span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: account.status === 'active' ? 'var(--green)' : account.status === 'breached' ? 'var(--red)' : 'var(--gold)' }} />
              <span style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                {account.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
          style={{
            color: 'var(--muted)',
            fontSize: '11.5px',
            lineHeight: 1.4,
            maxWidth: '480px',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Account Size: <span style={{ fontWeight: 600, color: 'var(--text)' }}>₹{Number(cap).toLocaleString('en-IN')}</span>
          {' | '}
          Equity: <span style={{ fontWeight: 700, color: profitPct >= 0 ? 'var(--green)' : 'var(--red)' }}>₹{Number(equity).toLocaleString('en-IN')} ({profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)</span>
        </motion.p>
      </div>

      {/* Right: Market Status, Refresh, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Market Status Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '99px',
            background: isMarketOpen ? 'rgba(34,197,139,0.1)' : 'rgba(240,82,95,0.1)',
            border: `1px solid ${isMarketOpen ? 'rgba(34,197,139,0.3)' : 'rgba(240,82,95,0.3)'}`,
            fontSize: '10.5px',
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            letterSpacing: '.04em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isMarketOpen ? 'var(--green)' : 'var(--red)',
              boxShadow: isMarketOpen ? '0 0 8px var(--brand-glow)' : '0 0 8px rgba(240,82,95,0.4)',
              animation: isMarketOpen ? 'pulse 2s ease-in-out infinite' : 'none',
            }}></span>
          <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text)' }}>
            {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
          {vix && (
            <>
              <span style={{ color: 'var(--muted)', fontWeight: 400 }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>VIX</span>
                <span style={{ fontWeight: 700, color: vix > 20 ? 'var(--red)' : vix > 15 ? 'var(--gold)' : 'var(--green)' }}>{vix}%</span>
              </span>
            </>
          )}
        </motion.div>

        {/* Refresh Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          aria-label="Refresh data"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={16} />
        </motion.button>

        {/* Notification Bell */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          aria-label="Notifications"
        >
          <Bell size={16} />
        </motion.button>

        {/* Profile Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '12px',
            color: '#040806',
            boxShadow: '0 4px 16px rgba(34,197,139,0.35)',
            flexShrink: 0,
          }}>
            {(profile?.full_name || profile?.email || 'T')[0].toUpperCase()}
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </motion.header>
  );
}