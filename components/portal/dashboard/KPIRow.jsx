'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function KPIRow({
  capital,
  todayPnl,
  equity,
  drawdown,
  drawdownLimit,
  isLoading = false
}) {
  const formatCurrency = (n) => formatINR(n, { decimals: 0 });
  const formatPnl = (n) => formatINR(n, { decimals: 0, sign: true });
  const has = (n) => n !== undefined && n !== null && Number.isFinite(Number(n));

  const hasLimit = has(drawdownLimit);
  const ddColor = !has(drawdown) || !hasLimit
    ? 'var(--text)'
    : drawdown > (drawdownLimit * 0.7) ? 'var(--red)'
    : drawdown > (drawdownLimit * 0.4) ? 'var(--gold)' : 'var(--green)';

  const kpis = [
    {
      key: 'equity',
      label: 'Equity',
      // accounts.equity — current account value. No fallback: '—' if genuinely missing.
      value: has(equity) ? formatCurrency(equity) : '—',
      icon: TrendingUp,
      color: 'var(--text)',
      trend: null,
    },
    {
      key: 'pnl',
      label: "Today's P&L",
      value: has(todayPnl) ? formatPnl(todayPnl) : '—',
      icon: has(todayPnl) && todayPnl >= 0 ? TrendingUp : TrendingDown,
      color: has(todayPnl) && todayPnl >= 0 ? 'var(--green)' : has(todayPnl) ? 'var(--red)' : 'var(--text)',
      trend: has(todayPnl) ? (todayPnl >= 0 ? 'positive' : 'negative') : null,
    },
    {
      key: 'drawdown',
      label: 'Drawdown Used',
      value: has(drawdown) ? `${Number(drawdown).toFixed(1)}%` : '—',
      icon: AlertTriangle,
      color: ddColor,
      trend: hasLimit && drawdown > (drawdownLimit * 0.7) ? 'warning' : hasLimit && drawdown > (drawdownLimit * 0.4) ? 'caution' : 'safe',
    },
    {
      key: 'capital',
      label: 'Capital',
      // plan.capital — starting account size. '—' if the plan row has no capital.
      value: has(capital) ? formatCurrency(capital) : '—',
      icon: Wallet,
      color: 'var(--text)',
      trend: null,
    },
  ];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
            style={{ padding: '14px 16px', minHeight: '76px' }}
          >
            <div style={{ height: '18px', width: '45%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '26px', width: '65%', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}
    >
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.key}
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
          style={{
            padding: '14px 16px',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--grad)', opacity: 0.7 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {kpi.icon && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                background: 'rgba(34,197,139,0.10)', border: '1px solid var(--border-glow)',
                color: kpi.color,
              }}>
                <kpi.icon size={12} strokeWidth={2.4} />
              </span>
            )}
            <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9.5px', letterSpacing: '.1em' }}>
              {kpi.label}
            </span>
          </div>

          <span style={{
            fontFamily: "'Unbounded', 'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(15px, 1.7vw, 21px)',
            lineHeight: 1.1,
            color: kpi.color,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            maxWidth: '100%',
            overflowWrap: 'anywhere',
          }}>
            {kpi.value}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}