'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Wallet, AlertTriangle, Activity } from 'lucide-react';

export default function DashboardKpiGrid({ 
  balance, 
  todayPnl, 
  equity, 
  drawdown,
  isLoading = false 
}) {
  const kpis = [
    {
      key: 'balance',
      label: 'Account Balance',
      value: balance !== undefined && balance !== null ? `₹${Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
      icon: Wallet,
      trend: null,
      color: 'var(--text)',
    },
    {
      key: 'pnl',
      label: "Today's P&L",
      value: todayPnl !== undefined && todayPnl !== null 
        ? `${todayPnl >= 0 ? '+' : '−'}₹${Math.abs(todayPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
        : '—',
      icon: todayPnl !== undefined && todayPnl !== null && todayPnl >= 0 ? TrendingUp : TrendingDown,
      color: todayPnl !== undefined && todayPnl !== null && todayPnl >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      key: 'equity',
      label: 'Equity',
      value: equity !== undefined && equity !== null ? `₹${Number(equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
      icon: TrendingUp,
      color: 'var(--text)',
    },
    {
      key: 'drawdown',
      label: 'Drawdown Used',
      value: drawdown !== undefined && drawdown !== null ? `${drawdown.toFixed(1)}%` : '—',
      icon: AlertTriangle,
      color: drawdown > 70 ? 'var(--red)' : drawdown > 40 ? 'var(--gold)' : 'var(--green)',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
            className="card"
            style={{ padding: '24px', minHeight: '120px' }}
          >
            <div style={{ height: '24px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '32px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}
    >
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.key}
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
          style={{ 
            padding: '24px', 
            position: 'relative',
            overflow: 'hidden',
            minHeight: '130px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          whileHover={{ y: -4, boxShadow: 'var(--shadow-md), var(--shadow-glow)' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--grad)', opacity: 0.8 }} />
          
          <div style={{ marginBottom: '16px' }}>
            <motion.span
              className="eyebrow"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
            >
              {kpi.label}
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
            style={{ marginBottom: '16px' }}
          >
            <span style={{ 
              fontFamily: "'Unbounded', 'Manrope', sans-serif", 
              fontWeight: 800, 
              fontSize: 'clamp(28px, 4vw, 42px)', 
              lineHeight: 1.1, 
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {kpi.value}
            </span>
          </motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            {kpi.icon && (
              <motion.span
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: [0.19, 1, 0.22, 1] }}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: kpi.color === 'var(--green)' ? 'rgba(34,197,139,0.12)' : 
                              kpi.color === 'var(--red)' ? 'rgba(240,82,95,0.12)' : 'rgba(34,197,139,0.12)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: '8px',
                  color: kpi.color,
                }}
              >
                <kpi.icon size={16} strokeWidth={2.5} />
              </motion.span>
            )}
            <motion.span
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: [0.19, 1, 0.22, 1] }}
              style={{ 
                fontSize: '12.5px', 
                fontWeight: 600, 
                fontFamily: "'Manrope', sans-serif",
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              KPI
            </motion.span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}