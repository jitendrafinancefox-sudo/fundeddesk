'use client';

/* Compact metrics row for the Account Overview card — Balance / Equity on
   the left, Avg Win / Avg Loss / Win Ratio / Profit Factor on the right.
   Deliberately ONE small row, not a card of its own: the equity chart
   (rendered by the caller right below this) is the primary content here,
   this is just the summary line above it. Everything else this component
   used to show (a second "Performance Metrics" card and a third "Account
   Details" card) was real data but redundant with the KPI row, the account
   summary card, and AccountContext — removed rather than repeated. */

import { formatINR } from '@/lib/format';

export default function AccountOverview({
  plan,
  equity,
  winRatio,
  avgWin,
  avgLoss,
  profitFactor,
  losingTrades,
  totalTrades,
  isLoading = false,
}) {
  const fin = (n) => Number.isFinite(Number(n));
  const capRaw = Number(plan?.capital);
  const cap = fin(capRaw) && capRaw > 0 ? capRaw : null;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', padding: '2px 0 14px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ minWidth: 70 }}>
            <div style={{ height: 10, width: '70%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: 16, width: '85%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { label: 'Account Balance', value: formatINR(cap, { decimals: 0 }) },
    { label: 'Equity', value: formatINR(equity, { decimals: 0 }) },
    { label: 'Average Win', value: totalTrades ? formatINR(avgWin, { decimals: 0 }) : '—' },
    { label: 'Average Loss', value: losingTrades ? formatINR(avgLoss, { decimals: 0 }) : '—' },
    { label: 'Win Ratio', value: totalTrades ? `${Number(winRatio || 0).toFixed(1)}%` : '—' },
    { label: 'Profit Factor', value: !losingTrades ? 'N/A' : (fin(profitFactor) ? Number(profitFactor).toFixed(2) : '—') },
  ];

  return (
    <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', padding: '2px 0 14px' }}>
      {items.map((it) => (
        <div key={it.label} style={{ minWidth: 70 }}>
          <div className="eyebrow" style={{ marginBottom: 4, fontSize: 9.5, letterSpacing: '.08em' }}>{it.label}</div>
          <div style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14.5, color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
          }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
