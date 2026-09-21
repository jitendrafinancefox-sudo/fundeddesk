'use client';

import { motion } from 'framer-motion';
import EquityCurve from './EquityCurve';
import AccountOverview from './AccountOverview';

export default function MainPerformanceArea({ account, plan, trades = [], metrics, secondaryRailExtra = null, isLoading = false }) {
  if (!account || !plan) return null;

  // Real DB fields only — no ₹10,00,000 fabrication. Null when genuinely absent.
  const capRaw = Number(plan.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
  const equityRaw = Number(account.equity);
  const equity = Number.isFinite(equityRaw) ? equityRaw : (cap ?? null);

  // Win/loss figures come from the canonical `metrics` prop (computed once
  // in app/portal/page.js via lib/tradeStats.js's computeTradeStats) rather
  // than being recomputed here — this was previously a second, independent
  // implementation that could disagree with /portal/analytics (Phase 12).
  const winRatio = metrics?.winRatio ?? null;
  const avgWin = metrics?.avgWin ?? null;
  const avgLoss = metrics?.avgLoss ?? null;
  const pf = metrics?.profitFactor ?? null;
  const losingTrades = metrics?.losingTrades ?? 0;
  const totalTrades = metrics?.totalTrades ?? trades.length;

  if (isLoading) {
    return (
      <div className="dash-split perf-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r)', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p>Loading performance…</p>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r)', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Loading performance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-split perf-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)' }}>
      {/* LEFT / DOMINANT: one "Account Overview" card — title, a small
          summary row, then the large equity chart. The chart is the
          content; the metrics above it are a caption, not a second card. */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ padding: '16px 20px 6px' }}
      >
        <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700 }}>Account Overview</h3>

        <AccountOverview
          plan={plan}
          equity={equity}
          winRatio={winRatio}
          avgWin={avgWin}
          avgLoss={avgLoss}
          profitFactor={pf}
          losingTrades={losingTrades}
          totalTrades={totalTrades}
          isLoading={false}
        />

        <div style={{ margin: '0 -20px' }}>
          <EquityCurve
            data={trades}
            capital={cap}
            currentEquity={equity}
            period="1M"
            height={320}
            isLoading={false}
          />
        </div>
      </motion.div>

      {/* RIGHT RAIL: which account this is, then what's currently running. */}
      <motion.div
        className="content-rail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {secondaryRailExtra}
      </motion.div>
    </div>
  );
}
