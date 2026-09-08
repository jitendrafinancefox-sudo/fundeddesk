'use client';

import { motion } from 'framer-motion';
import { IS_MARKET_OPEN } from '@/components/terminal/constants';

export default function TopHeader({ 
  account, 
  accounts = [], 
  selectedAccountId, 
  onAccountChange,
  profile,
  marketStatus,
  vix 
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Left: Brand */}
      <Link href="/portal" className="logo" style={{ 
        fontSize: 18, fontWeight: 800, fontFamily: "'Unbounded', sans-serif",
        color: 'var(--text)', textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 10, background: 'var(--grad)',
          display: 'grid', placeItems: 'center', fontFamily: 'Manrope, sans-serif',
          fontWeight: 800, fontSize: 13, color: '#040806',
        }}>◆</span>
        <span>FundedDesk</span>
      </Link>

      {/* Center: Account Selector */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <AccountSelector 
          accounts={accounts} 
          selectedAccountId={selectedAccountId} 
          onSelect={onAccountChange}
        />
      </div>

      {/* Right: Market Status, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Market Status Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '99px',
            background: 'rgba(34,197,139,0.1)',
            border: '1px solid rgba(34,197,139,0.2)',
            fontSize: '12.5px',
            fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            letterSpacing: '.04em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: IS_MARKET_OPEN() ? 'var(--green)' : 'var(--red)',
              boxShadow: '0 0 12px var(--brand-glow)',
              animation: 'pulse 2s ease-in-out infinite',
            }}></span>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
            {IS_MARKET_OPEN() ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
        </motion.div>

        {/* Notification Bell */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(34,197,139,0.1)',
            border: '1px solid rgba(34,197,139,0.2)',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34,197,139,0.15)';
            e.currentTarget.style.borderColor = 'rgba(34,197,139,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(34,197,139,0.1)';
            e.currentTarget.style.borderColor = 'rgba(34,197,139,0.2)';
          }}
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 1 12 14a6 6 0 0 1-6-6" />
            <path d="M12 2v2" />
            <path d="M12 16v2" />
          </svg>
        </motion.button>

        {/* Account Selector - will be passed as prop */}
        {accountSelector}

        {/* Profile Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '14px',
            color: '#040806',
            boxShadow: '0 4px 16px rgba(34,197,139,0.35)',
            flexShrink: 0,
          }}>
            ◆
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}