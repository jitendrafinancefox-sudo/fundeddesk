'use client';

import { motion } from 'framer-motion';
import EquityCurve from './EquityCurve';
import AccountOverview from './AccountOverview';
import { getRulesForAccount } from '@/lib/rules';

export default function MainPerformanceArea({ account, plan, trades = [], metrics, primaryRailExtra = null, secondaryRailExtra = null, isLoading = false }) {
  if (!account || !plan) return null;

  const rules = getRulesForAccount(account, plan);
  // Real DB fields only — no ₹10,00,000 fabrication. Null when genuinely absent.
  const capRaw = Number(plan.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
  const equityRaw = Number(account.equity);
  const equity = Number.isFinite(equityRaw) ? equityRaw : (cap ?? null);
  const profitPct = (cap != null && equity != null) ? ((equity - cap) / cap) * 100 : null;

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRatio = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? grossW / wins.length : 0;
  const avgLoss = losses.length ? grossL / losses.length : 0;
  // Undefined ratio (no losing trades to divide by) — surfaced as N/A, not a fake 99.
  const pf = grossL > 0 ? grossW / grossL : null;
  const totalTrades = trades.length;

  // Calculate drawdown — a % drawdown needs a real capital base.
  let maxDD = null;
  if (cap != null) {
    let peak = cap;
    let runningEquity = cap;
    let dd = 0;
    trades.forEach(t => {
      runningEquity += t.pnl;
      if (runningEquity > peak) peak = runningEquity;
      const x = (peak - runningEquity) / peak * 100;
      if (x > dd) dd = x;
    });
    maxDD = dd;
  }

  // Today's P&L
  const todayPnl = trades
    .filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pnl, 0);

  // Profitable trading days
  const pdThreshold = cap != null ? cap * 0.001 : 0;
  const profitableDays = trades
    .filter(t => t.pnl > pdThreshold)
    .map(t => new Date(t.traded_at).toDateString());
  const uniqueProfitableDays = [...new Set(profitableDays)].length;
  // Resolved rule only — null (→ "—") when the plan/phase does not define it,
  // matching AccountContext. No guessed requirement.
  const requiredProfitableDays = Number.isFinite(Number(rules.profitableTradingDays))
    ? Number(rules.profitableTradingDays)
    : null;
  
  // Best/Worst trades — null when that side has no trades (not a ₹0 "trade")
  const bestTrade = wins.length ? Math.max(...wins.map(t => t.pnl)) : null;
  const worstTrade = losses.length ? Math.min(...losses.map(t => t.pnl)) : null;
  
  // Trading days
  const tradingDays = new Set(trades.map(t => new Date(t.traded_at).toDateString())).size;

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
      {/* LEFT RAIL: equity chart, then whatever the page stacks below it
          (open positions, recent trades). Flows independently of the right rail. */}
      <div className="content-rail">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
          }}
        >
          <EquityCurve
            data={trades}
            capital={cap}
            currentEquity={equity}
            period="1M"
            height={360}
            isLoading={false}
          />
        </motion.div>
        {primaryRailExtra}
      </div>

      {/* RIGHT RAIL: Account Overview stack */}
      <motion.div
        className="content-rail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AccountOverview
          account={account}
          plan={plan}
          equity={equity}
          todayPnl={todayPnl}
          maxDD={maxDD}
          maxDDLimit={rules.maximumDrawdownPct || 10}
          profitPct={profitPct}
          winRatio={winRatio}
          avgWin={avgWin}
          avgLoss={avgLoss}
          profitFactor={pf}
          totalTrades={totalTrades}
          winningTrades={wins.length}
          losingTrades={losses.length}
          bestTrade={bestTrade}
          worstTrade={worstTrade}
          tradingDays={tradingDays}
          uniqueProfitableDays={uniqueProfitableDays}
          requiredProfitableDays={requiredProfitableDays}
          isLoading={false}
        />
        {secondaryRailExtra}
      </motion.div>
    </div>
  );
}