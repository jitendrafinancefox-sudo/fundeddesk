'use client';

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function KPIRow({
  todayPnl,
  equity,
  drawdown,
  drawdownLimit,
  profitPct,
  targetPct,
  isLoading = false
}) {
  const formatCurrency = (n) => formatINR(n, { decimals: 0 });
  const formatPnl = (n) => formatINR(n, { decimals: 0, sign: true });
  const has = (n) => n !== undefined && n !== null && Number.isFinite(Number(n));
  const pctStr = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;

  const hasLimit = has(drawdownLimit);
  const ddColor = !has(drawdown) || !hasLimit
    ? 'var(--text)'
    : drawdown > (drawdownLimit * 0.7) ? 'var(--red)'
    : drawdown > (drawdownLimit * 0.4) ? 'var(--gold)' : 'var(--green)';

  const hasTarget = has(targetPct);
  const targetReached = hasTarget && has(profitPct) && profitPct >= targetPct;

  const kpis = [
    {
      key: 'balance',
      label: 'Account Balance',
      // accounts.equity — current account value. No fallback: '—' if genuinely missing.
      value: has(equity) ? formatCurrency(equity) : '—',
      // Same real return already shown on Profit Target — one honest number,
      // not a fabricated "since yesterday" delta we don't actually track.
      sub: has(profitPct) ? pctStr(profitPct) : null,
      subColor: has(profitPct) ? (profitPct >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--muted)',
      icon: Wallet,
      color: 'var(--text)',
    },
    {
      key: 'pnl',
      label: "Today's P&L",
      value: has(todayPnl) ? formatPnl(todayPnl) : '—',
      sub: null,
      icon: has(todayPnl) && todayPnl >= 0 ? TrendingUp : TrendingDown,
      color: has(todayPnl) && todayPnl >= 0 ? 'var(--green)' : has(todayPnl) ? 'var(--red)' : 'var(--text)',
    },
    {
      key: 'drawdown',
      label: 'Max Drawdown Used',
      value: has(drawdown) ? `${Number(drawdown).toFixed(1)}%` : '—',
      sub: hasLimit ? `of ${drawdownLimit}% limit` : null,
      subColor: 'var(--muted)',
      icon: AlertTriangle,
      color: ddColor,
    },
    {
      key: 'target',
      label: 'Profit Target',
      value: has(profitPct) ? pctStr(profitPct) : '—',
      sub: hasTarget ? (targetReached ? 'Target reached' : `of ${targetPct}% target`) : 'No target this phase',
      subColor: targetReached ? 'var(--green)' : 'var(--muted)',
      icon: Target,
      color: 'var(--text)',
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
            style={{ padding: '18px 20px', minHeight: '128px' }}
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
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: '128px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {kpi.icon && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              color: kpi.color,
            }}>
              <kpi.icon size={16} strokeWidth={2} />
            </span>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="eyebrow" style={{ marginBottom: 0, fontSize: '10.5px', letterSpacing: '.09em' }}>
              {kpi.label}
            </span>

            <span style={{
              fontFamily: "'Unbounded', 'Manrope', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(20px, 2.1vw, 27px)',
              lineHeight: 1.1,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}>
              {kpi.value}
            </span>

            {kpi.sub && (
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: kpi.subColor || 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
                {kpi.sub}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}