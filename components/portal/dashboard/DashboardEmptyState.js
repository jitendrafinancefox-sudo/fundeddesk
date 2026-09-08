'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const BTN_BASE = {
  padding: '14px 28px',
  borderRadius: '99px',
  fontSize: '14px',
  fontFamily: "'Manrope', sans-serif",
  letterSpacing: '-0.01em',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s var(--ease)',
  color: 'var(--text)',
  textDecoration: 'none',
};

const BTN_VARIANT = {
  primary: { ...BTN_BASE, fontWeight: 700, border: 'none', background: 'var(--grad)', boxShadow: 'var(--shadow-glow)' },
  secondary: { ...BTN_BASE, fontWeight: 600, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' },
};

function ActionButton({ action }) {
  if (!action) return null;
  const isPrimary = action.variant === 'primary';
  const style = BTN_VARIANT[action.variant] || BTN_VARIANT.secondary;

  const onMouseEnter = isPrimary
    ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; }
    : (e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.05)'; e.currentTarget.style.borderColor = 'var(--brand)'; };
  const onMouseLeave = isPrimary
    ? (e) => { e.currentTarget.style.transform = 'translateY(0)'; }
    : (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'var(--border)'; };

  const inner = (
    <>
      {action.label}
      {isPrimary && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
    </>
  );

  // href → real navigation via Next.js Link; otherwise a real onClick button.
  if (action.href) {
    return (
      <Link href={action.href} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={action.onClick} style={style} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {inner}
    </button>
  );
}

export default function DashboardEmptyState({
  type = 'no-account',
  onCreateAccount,
  onSelectAccount,
  accounts = [],
  isLoading = false
}) {
  const states = {
    'no-account': {
      icon: '🎯',
      title: 'No Funded Account Yet',
      description: 'You haven\'t connected any funded trading accounts. Start a challenge to begin your funded trading journey.',
      primaryAction: { label: 'Start New Challenge', onClick: onCreateAccount, variant: 'primary' },
      secondaryAction: { label: 'Browse Challenges', href: '/challenges', variant: 'secondary' },
      features: [
        { icon: '📊', label: 'Real-time P&L tracking' },
        { icon: '🎯', label: 'Challenge progress monitoring' },
        { icon: '📈', label: 'Performance analytics' },
        { icon: '💰', label: 'Profit withdrawal requests' },
      ],
    },
    'no-data': {
      icon: '📭',
      title: 'No Trading Data Available',
      description: 'Your account is connected but there\'s no trading activity yet. Open the terminal to start trading.',
      primaryAction: { label: 'Open Terminal', href: '/portal/terminal', variant: 'primary' },
      secondaryAction: { label: 'View Account Details', href: '/portal/accounts', variant: 'secondary' },
      features: [
        { icon: '📈', label: 'Live NIFTY/BANKNIFTY options' },
        { icon: '⚡', label: 'One-click order execution' },
        { icon: '🛡️', label: 'Risk management tools' },
        { icon: '📋', label: 'Trade journal & analytics' },
      ],
    },
    'loading': {
      icon: '⏳',
      title: 'Loading Dashboard...',
      description: 'Fetching your account data and market information. This may take a few seconds.',
      primaryAction: null,
      secondaryAction: null,
      features: [],
    },
    'error': {
      icon: '⚠️',
      title: 'Unable to Load Data',
      description: 'We couldn\'t fetch your account data. Please check your connection and try again.',
      primaryAction: { label: 'Retry', onClick: () => window.location.reload(), variant: 'primary' },
      secondaryAction: { label: 'Contact Support', href: '/portal/support', variant: 'secondary' },
      features: [],
    },
  };

  const state = states[type];

  if (isLoading || type === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30vh', padding: '36px 20px', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center', fontSize: '24px', marginBottom: '16px', animation: 'pulse 2s ease-in-out infinite' }}>⏳</div>
        <h2 style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', marginBottom: '10px', fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800 }}>Loading Dashboard</h2>
        <p style={{ color: 'var(--muted)', maxWidth: '400px', marginBottom: '18px', fontSize: '14px', lineHeight: 1.6 }}>
          Fetching your account data, positions, and market information...
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', animation: 'bounce 1.4s ease-in-out infinite both' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', animation: 'bounce 1.4s ease-in-out infinite both', animationDelay: '-0.32s' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', animation: 'bounce 1.4s ease-in-out infinite both', animationDelay: '-0.16s' }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '38vh', padding: '32px 20px', textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
        style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center', fontSize: '28px', marginBottom: '18px' }}
      >
        {state.icon}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
        style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', marginBottom: '10px', fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        {state.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.19, 1, 0.22, 1] }}
        style={{ color: 'var(--muted)', maxWidth: '440px', marginBottom: '20px', fontSize: '14px', lineHeight: 1.6 }}
      >
        {state.description}
      </motion.p>

      {state.features.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', maxWidth: '540px', width: '100%', marginBottom: '20px' }}
        >
          {state.features.map((feature, i) => (
            <motion.div
              key={feature.label}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
              style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}
            >
              <span style={{ fontSize: '24px' }}>{feature.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: [0.19, 1, 0.22, 1] }}
        style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <ActionButton action={state.primaryAction} />
        <ActionButton action={state.secondaryAction} />
      </motion.div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </motion.div>
  );
}
