'use client';

import { motion } from 'framer-motion';

const actions = [
  { 
    id: 'terminal', 
    label: 'Open Terminal', 
    description: 'Launch trading terminal', 
    icon: '📈',
    href: '/portal/terminal',
    variant: 'primary',
    hotkey: '⌘T',
  },
  { 
    id: 'accounts', 
    label: 'View Accounts', 
    description: 'Manage funded accounts', 
    icon: '👥',
    href: '/portal/accounts',
    variant: 'secondary',
    hotkey: '⌘A',
  },
  { 
    id: 'payout', 
    label: 'Request Payout', 
    description: 'Withdraw profits', 
    icon: '💸',
    href: '/portal/payouts',
    variant: 'secondary',
    hotkey: '⌘W',
  },
  { 
    id: 'rules', 
    label: 'View Rules', 
    description: 'Challenge rules & terms', 
    icon: '📋',
    href: '/rules',
    variant: 'ghost',
    hotkey: '⌘R',
  },
];

export default function QuickActions({ 
  onActionClick,
  disabledActions = [],
  isLoading = false 
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Quick Actions</h3>
      </div>

      <div style={{ padding: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {actions.map((action, i) => (
            <motion.button
              key={action.id}
              onClick={() => { onActionClick?.(action.id); if (action.href) window.location.href = action.href; }}
              disabled={disabledActions.includes(action.id) || isLoading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 14px',
                borderRadius: 'var(--r)',
                border: action.variant === 'primary' ? 'none' : action.variant === 'secondary' ? '1px solid var(--border)' : '1px solid var(--border)',
                background: action.variant === 'primary' ? 'var(--grad)' : action.variant === 'secondary' ? 'rgba(34,197,139,0.05)' : 'rgba(255,255,255,0.02)',
                color: action.variant === 'primary' ? '#040806' : 'var(--text)',
                cursor: disabledActions.includes(action.id) || isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s var(--ease)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: 600,
                textAlign: 'center',
                boxShadow: action.variant === 'primary' ? 'var(--shadow-glow)' : 'none',
                opacity: disabledActions.includes(action.id) || isLoading ? 0.5 : 1,
              }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.04, ease: [0.19, 1, 0.22, 1] }}
              whileHover={{ 
                scale: disabledActions.includes(action.id) || isLoading ? 1 : 1.02,
                y: disabledActions.includes(action.id) || isLoading ? 0 : -2,
                boxShadow: action.variant === 'primary' ? 'var(--shadow-glow)' : '0 8px 32px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{action.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '12.5px', letterSpacing: '-0.01em' }}>{action.label}</span>
                <span style={{ fontSize: '10px', color: action.variant === 'primary' ? 'rgba(4,8,6,0.6)' : 'var(--muted)', fontWeight: 500 }}>{action.description}</span>
                <span style={{ fontSize: '8.5px', color: action.variant === 'primary' ? 'rgba(4,8,6,0.5)' : 'var(--muted)', fontFamily: "'Manrope', sans-serif", letterSpacing: '.05em', padding: '1px 5px', borderRadius: '4px', background: action.variant === 'primary' ? 'rgba(4,8,6,0.1)' : 'rgba(255,255,255,0.05)' }}>{action.hotkey}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Keyboard shortcuts hint */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '9.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>⌘</kbd>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>T</kbd>
            <span>Open Terminal</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>⌘</kbd>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>A</kbd>
            <span>View Accounts</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>⌘</kbd>
            <kbd style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>W</kbd>
            <span>Request Payout</span>
          </span>
        </div>
      </div>
    </div>
  );
}