'use client';

import { motion } from 'framer-motion';
import { formatINR } from '@/lib/format';

export default function AccountOverview({
  account,
  plan,
  equity,
  todayPnl,
  maxDD,
  maxDDLimit,
  profitPct,
  winRatio,
  avgWin,
  avgLoss,
  profitFactor,
  totalTrades,
  winningTrades,
  losingTrades,
  bestTrade,
  worstTrade,
  tradingDays,
  uniqueProfitableDays,
  requiredProfitableDays,
  isLoading = false
}) {
  const formatCurrency = (n) => formatINR(n, { decimals: 0 });
  const formatPnl = (n) => formatINR(n, { decimals: 0, sign: true });

  const fin = (n) => Number.isFinite(Number(n));
  const pct = (n, digits = 2, sign = false) => {
    if (!fin(n)) return '—';
    const v = Number(n);
    return `${sign && v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
  };

  const formatPct = (n) => {
    if (n === null || n === undefined) return '—';
    return `${Number(n || 0).toFixed(1)}%`;
  };

  const formatNumber = (n) => {
    if (n === null || n === undefined) return '—';
    return Number(n || 0).toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
          <span style={{ marginTop: '12px', color: 'var(--muted)', fontSize: 13 }}>Loading account…</span>
        </div>
      </div>
    );
  }

  // Real plan capital only — never substitute a placeholder amount.
  const capRaw = Number(plan?.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Account Overview Card */}
      <div className="card" style={{ padding: 0, background: 'rgba(34,197,139,0.03)', border: '1px solid rgba(34,197,139,0.15)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Account Overview</h3>
        </div>

        <div style={{ padding: '14px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
          }}>
            <OverviewMetric
              label="Capital"
              value={formatCurrency(cap)}
              color="var(--text)"
            />
            <OverviewMetric
              label="Today's P&L"
              value={fin(todayPnl) ? formatPnl(todayPnl) : '—'}
              color={fin(todayPnl) ? (todayPnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text)'}
            />
            <OverviewMetric
              label="Equity"
              value={formatCurrency(equity)}
              color="var(--text)"
            />
            <OverviewMetric
              label="Max DD Used"
              value={pct(maxDD, 1)}
              color={!fin(maxDD) || !fin(maxDDLimit) ? 'var(--text)' : maxDD < (maxDDLimit * 0.5) ? 'var(--green)' : maxDD < (maxDDLimit * 0.8) ? 'var(--gold)' : 'var(--red)'}
            />
            <OverviewMetric
              label="Return"
              value={pct(profitPct, 2, true)}
              color={!fin(profitPct) ? 'var(--text)' : profitPct >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <OverviewMetric
              label="Profitable Days"
              value={`${uniqueProfitableDays} / ${requiredProfitableDays ?? '—'}`}
              color="var(--blue)"
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics Card */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Performance Metrics</h3>
        </div>

        <div style={{ padding: '14px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
          }}>
            <PerformanceMetric
              label="Win Rate"
              value={totalTrades ? `${winRatio.toFixed(1)}%` : '—'}
              target="> 50%"
              status={winRatio >= 50 ? 'pass' : winRatio >= 40 ? 'progress' : 'warning'}
              color={winRatio >= 50 ? 'var(--green)' : winRatio >= 40 ? 'var(--blue)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Profit Factor"
              value={losingTrades === 0 ? 'N/A' : (Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : '—')}
              target={losingTrades === 0 ? '—' : '> 1.5'}
              status={losingTrades === 0 ? 'neutral' : profitFactor >= 1.5 ? 'pass' : profitFactor >= 1.2 ? 'progress' : 'warning'}
              color={losingTrades === 0 ? 'var(--text)' : profitFactor >= 1.5 ? 'var(--green)' : profitFactor >= 1.2 ? 'var(--blue)' : 'var(--gold)'}
            />
            <PerformanceMetric
              label="Avg Win"
              value={winningTrades === 0 ? '—' : formatINR(avgWin, { decimals: 0 })}
              target="> Avg Loss"
              status={winningTrades === 0 ? 'neutral' : avgWin > avgLoss ? 'pass' : 'warning'}
              color={winningTrades === 0 ? 'var(--text)' : avgWin > avgLoss ? 'var(--green)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Avg Loss"
              value={losingTrades === 0 ? '—' : formatINR(avgLoss, { decimals: 0 })}
              target={losingTrades === 0 ? '—' : '< Avg Win'}
              status={losingTrades === 0 ? 'neutral' : avgLoss < avgWin ? 'pass' : 'warning'}
              color={losingTrades === 0 ? 'var(--text)' : avgLoss < avgWin ? 'var(--green)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Total Trades"
              value={totalTrades.toString()}
              target="—"
              status="neutral"
              color="var(--blue)"
            />
            <PerformanceMetric
              label="Best Trade"
              value={winningTrades === 0 ? '—' : formatINR(bestTrade, { decimals: 0 })}
              target="—"
              status="neutral"
              color="var(--green)"
            />
            <PerformanceMetric
              label="Worst Trade"
              value={losingTrades === 0 ? 'No losses' : formatINR(worstTrade, { decimals: 0 })}
              target="—"
              status="neutral"
              color={losingTrades === 0 ? 'var(--text)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Trading Days"
              value={tradingDays ? tradingDays.toString() : '0'}
              target="—"
              status="neutral"
              color="var(--blue)"
            />
          </div>
        </div>
      </div>

      {/* Account Details Card */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Account Details</h3>
        </div>

        <div style={{ padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            <DetailRow label="Account ID" value={account?.login_id || '—'} />
            <DetailRow label="Plan" value={plan?.name || '—'} />
            <DetailRow label="Account Size" value={formatCurrency(cap)} />
            <DetailRow label="Phase" value={account?.phase?.toUpperCase() || 'PHASE 1'} />
            <DetailRow label="Status" value={
              <span className={`tag ${account?.status === 'active' ? 'tag-green' : account?.status === 'breached' ? 'tag-red' : 'tag-gold'}`}>
                {account?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            } />
            <DetailRow label="Created" value={account?.created_at ? new Date(account.created_at).toLocaleDateString('en-IN') : '—'} />
            <DetailRow label="Total Trades" value={totalTrades.toString()} />
            <DetailRow label="Days Traded" value={tradingDays.toString()} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function OverviewMetric({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '11px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>{label}</span>
      <span style={{
        fontFamily: "'Unbounded', 'Manrope', sans-serif",
        fontWeight: 800,
        fontSize: 'clamp(14px, 1.7vw, 18px)',
        lineHeight: 1.1,
        color: color,
        fontVariantNumeric: 'tabular-nums',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
      }}>
        {value}
      </span>
    </div>
  );
}

function PerformanceMetric({ label, value, target, status, color }) {
  const statusConfig = {
    pass: { label: 'GOOD', bg: 'rgba(34,197,139,0.1)', text: 'var(--green)' },
    progress: { label: 'PROGRESS', bg: 'rgba(59,130,246,0.1)', text: 'var(--blue)' },
    warning: { label: 'WARNING', bg: 'rgba(255,180,0,0.1)', text: 'var(--gold)' },
    neutral: { label: 'INFO', bg: 'rgba(59,130,246,0.1)', text: 'var(--blue)' },
  };
  
  const config = statusConfig[status] || statusConfig.neutral;

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{ padding: '11px 12px', position: 'relative', overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color, opacity: 0.7 }} />

      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>{label}</span>

      <span style={{
        fontFamily: "'Unbounded', 'Manrope', sans-serif",
        fontWeight: 800,
        fontSize: 'clamp(14px, 1.7vw, 18px)',
        lineHeight: 1.1,
        color: color,
        fontVariantNumeric: 'tabular-nums',
        maxWidth: '100%',
        overflowWrap: 'anywhere',
      }}>
        {value}
      </span>

      {target && target !== '—' && (
        <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}>
          Target: {target}
        </span>
      )}
    </motion.div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="card" style={{ padding: '9px 11px', minWidth: 0 }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>{label}</span>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', fontFamily: "'Manrope', sans-serif", marginTop: '3px', overflowWrap: 'anywhere' }}>
        {value}
      </div>
    </div>
  );
}