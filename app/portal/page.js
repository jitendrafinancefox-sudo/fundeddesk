'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import KPIRow from '@/components/portal/dashboard/KPIRow';
import MainPerformanceArea from '@/components/portal/dashboard/MainPerformanceArea';
import AccountSummaryCard from '@/components/portal/dashboard/AccountSummaryCard';
import OpenPositionsTable from '@/components/portal/dashboard/OpenPositionsTable';
import RecentTradesTable from '@/components/portal/dashboard/RecentTradesTable';
import IndianMarketStatus from '@/components/portal/dashboard/IndianMarketStatus';
import PnLHeatmap from '@/components/portal/dashboard/PnLHeatmap.jsx';
import PerformanceAnalytics from '@/components/portal/dashboard/PerformanceAnalytics';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';
import AccountContext from '@/components/portal/dashboard/AccountContext';
import MarketSession from '@/components/portal/dashboard/MarketSession';
import { getRulesForAccount } from '@/lib/rules';
import { computeTradeStats } from '@/lib/tradeStats';

export default function PortalPage() {
  // Session, profile, accounts and the selected account come from the one
  // portal-wide context (PortalDataProvider) — the account selector lives in
  // the portal topbar now, so there is no second fetch or selector here.
  const {
    profile,
    accounts,
    selectedAccount,
    selectAccount,
  } = usePortalData();

  const [trades, setTrades] = useState([]);
  const [positions, setPositions] = useState([]);
  // Per-account data (trades / positions / breaches) load state — the shell has
  // already resolved the session by the time this page renders.
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({
    nifty: null,
    bankNifty: null,
    finNifty: null,
    vix: null,
    status: 'CLOSED',
  });
  const [monthlyReturns, setMonthlyReturns] = useState([]);
  const [error, setError] = useState(null);
  const [softBreaches, setSoftBreaches] = useState({});

  useEffect(() => {
    // Clear the previous account's per-account data before (re)fetching so the
    // dashboard never shows one account's trades/positions/metrics under another
    // account's header during the fetch.
    setTrades([]);
    setPositions([]);
    setMonthlyReturns([]);
    setSoftBreaches({});
    setError(null);

    if (!selectedAccount) { setLoading(false); return; }

    setLoading(true);
    let mounted = true;
    (async () => {
      try {
        // Fetch trades
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', selectedAccount.id)
          .order('traded_at', { ascending: true });

        if (!mounted) return;
        setTrades(tradesData || []);

        // Generate monthly returns from trades — only when a real capital base
        // exists (a % return needs a real denominator, not a placeholder).
        const mCapRaw = Number(selectedAccount.plans?.capital);
        const mCap = Number.isFinite(mCapRaw) && mCapRaw > 0 ? mCapRaw : null;
        if (tradesData?.length && mCap != null) {
          const monthly = {};
          tradesData.forEach(t => {
            const month = new Date(t.traded_at).toLocaleString('default', { month: 'short' });
            const year = new Date(t.traded_at).getFullYear();
            const key = `${month} ${year}`;
            if (!monthly[key]) monthly[key] = { return: 0, trades: 0 };
            monthly[key].return += (t.pnl / mCap) * 100;
            monthly[key].trades += 1;
          });
          setMonthlyReturns(Object.entries(monthly).map(([month, data]) => ({ month, ...data })));
        } else {
          setMonthlyReturns([]);
        }

        // Open positions: no persistent production positions table exists
        // (no migration creates one) and nothing would ever write to it —
        // there is no broker execution path (lib/execution/BrokerExecutionProvider
        // is an explicit not-configured stub) and the terminal's simulator
        // never touches Supabase. lib/riskEngine.js's own NO_UNREALIZED_PNL
        // data gap already documents that only realized, closed trade P&L is
        // recorded for production accounts. `positions` stays the empty
        // array it was cleared to above — an honest "none tracked," not a
        // query against a table that doesn't exist.

        // Fetch soft breaches
        const { data: breachesData } = await supabase
          .from('soft_breaches')
          .select('rule_type, breach_count, last_breach_at')
          .eq('account_id', selectedAccount.id);

        if (!mounted) return;
        const breaches = {};
        if (breachesData) {
          breachesData.forEach(row => {
            breaches[row.rule_type] = {
              count: row.breach_count,
              lastBreachAt: row.last_breach_at,
            };
          });
        }
        setSoftBreaches(breaches);
      } catch (err) {
        console.error('Failed to fetch trades/positions/breaches:', err);
        if (mounted) setError(err.message || 'Failed to load account data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedAccount]);

  // Compute account metrics
  function computeMetrics() {
    if (!selectedAccount || !trades.length) return null;

    // Real DB fields only — cap is null when the plan row has no capital.
    const capRaw = Number(selectedAccount.plans?.capital);
    const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
    const equityRaw = Number(selectedAccount.equity);
    const equity = Number.isFinite(equityRaw) ? equityRaw : (cap ?? null);

    // Canonical trade-derived stats — lib/tradeStats.js is the single
    // source of truth for win/loss/profit-factor/expectancy figures (Phase
    // 12) so this page's numbers can never diverge from /portal/analytics.
    // winRate's denominator is decided (non-break-even) trades and avgLoss
    // is signed (negative) — both exactly as tradeStats.js defines them.
    const stats = computeTradeStats(trades);
    const tradingDays = new Set(trades.map(t => new Date(t.traded_at).toDateString())).size;

    // Per-trade returns as % of capital. Requires a real capital base.
    const returns = cap != null ? trades.map(t => (t.pnl / cap) * 100) : [];
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const rawStdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length)
      : 0;
    const enoughForRatios = returns.length > 1 && rawStdDev > 1e-9;

    // PER-TRADE risk-adjusted return (mean / std of per-trade returns). NOT
    // annualised: per-trade observations are not daily returns, so a sqrt(252)
    // factor would be mathematically dishonest. N/A until there is real dispersion.
    const sharpeRatio = enoughForRatios ? avgReturn / rawStdDev : null;

    const negativeReturns = returns.filter(r => r < 0);
    const downsideDev = negativeReturns.length
      ? Math.sqrt(negativeReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / negativeReturns.length)
      : rawStdDev;
    const sortinoRatio = (enoughForRatios && downsideDev > 1e-9)
      ? avgReturn / downsideDev
      : null;

    // Calmar (total return % / max drawdown %) — needs a real capital base.
    let maxDD = null;
    let calmarRatio = null;
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
      calmarRatio = dd > 1e-9 ? ((runningEquity - cap) / cap * 100) / dd : null;
    }

    // Kelly Criterion — needs a real win/loss payoff ratio. stats.avgLoss is
    // canonically signed (negative), so Math.abs() only at this formula's
    // own input boundary (Kelly's odds ratio needs a positive magnitude);
    // the formula itself is unchanged, and winProb now uses the same
    // decided-trades win rate as everywhere else. N/A when there are no
    // losing trades (payoff ratio undefined) or no decided trades.
    const kellyCriterion = (stats.avgWin != null && stats.avgLoss != null && stats.avgLoss !== 0 && stats.winRate != null)
      ? (() => { const winProb = stats.winRate / 100; return (winProb - (1 - winProb) / (stats.avgWin / Math.abs(stats.avgLoss))) * 100; })()
      : null;

    return {
      equity: equity,
      todayPnl: trades.filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString()).reduce((s, t) => s + t.pnl, 0),
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
      winRatio: stats.winRate,
      profitFactor: stats.profitFactor,
      totalTrades: stats.total,
      winningTrades: stats.wins,
      losingTrades: stats.losses,
      bestTrade: stats.bestTrade,
      worstTrade: stats.worstTrade,
      tradingDays,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: maxDD == null ? null : (maxDD > 0 ? -maxDD : 0),
      expectancy: stats.expectancy,
      kellyCriterion,
    };
  }

  const metrics = computeMetrics();

  function handleNewChallenge() {
    window.location.href = '/challenges';
  }

  if (loading) {
    return <DashboardEmptyState type="loading" />;
  }

  if (error) {
    return <DashboardEmptyState type="error" />;
  }

  if (!accounts.length) {
    return (
      <DashboardEmptyState
        type="no-account"
        onCreateAccount={handleNewChallenge}
        profile={profile}
      />
    );
  }

  if (!selectedAccount) {
    return (
      <DashboardEmptyState
        type="no-account"
        onCreateAccount={handleNewChallenge}
        profile={profile}
        accounts={accounts}
        onSelectAccount={() => selectAccount(accounts[0].id)}
      />
    );
  }

  if (!trades.length && !positions.length) {
    return (
      <div className="portal-dashboard">
        <DashboardEmptyState
          type="no-data"
          onSelectAccount={() => {}}
          profile={profile}
        />
      </div>
    );
  }

  // Transform positions for OpenPositionsTable component
  const transformedPositions = positions.map(p => ({
    id: p.id,
    symbol: p.symbol,
    kind: p.kind || null,
    side: p.side,
    qty: p.qty,
    avgPrice: p.avg_price || p.entry_price,
    currentPrice: p.current_price || p.avg_price || p.entry_price,
    pnl: p.pnl || 0,
    pnlPct: p.pnl_pct || 0,
    sl: p.stop_loss,
    tp: p.take_profit,
    margin: p.margin || 0,
    strike: p.strike,
    expiry: p.expiry,
    option_type: p.option_type,
    underlying: p.underlying,
  }));

  // Transform trades for RecentTradesTable component. Every public.trades
  // row is already a closed/realized ledger event (Phase 11) — there is no
  // production exit_price to filter on, and a legitimate pnl = 0 trade must
  // still appear here.
  const transformedTrades = trades
    .slice(-20)
    .reverse()
    .map(t => ({
      id: t.id,
      // `symbol` doesn't exist on the base trades schema (supabase/schema.sql
      // only has `instrument`) — prefer it when present, fall back to the
      // real column that actually exists instead of showing a blank dash.
      symbol: t.symbol || t.instrument,
      type: t.type || null,
      side: t.side,
      qty: t.qty,
      entryPrice: t.entry_price,
      exitPrice: t.exit_price,
      pnl: t.pnl,
      pnlPct: t.pnl_pct || (t.entry_price ? (t.pnl / Math.abs(t.entry_price * t.qty)) * 100 : 0),
      tradedAt: t.traded_at,
      strike: t.strike,
      expiry: t.expiry,
      option_type: t.option_type,
    }));

  // Today's P&L for KPI
  const todayPnl = trades
    .filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pnl, 0);

  // Drawdown for KPI — a % drawdown needs a real capital base. null → "—".
  const kpiCapRaw = Number(selectedAccount.plans?.capital);
  const kpiCap = Number.isFinite(kpiCapRaw) && kpiCapRaw > 0 ? kpiCapRaw : null;
  let maxDD = null;
  if (kpiCap != null) {
    let peak = kpiCap;
    let runningEquity = kpiCap;
    let dd = 0;
    trades.forEach(t => {
      runningEquity += t.pnl;
      if (runningEquity > peak) peak = runningEquity;
      const x = (peak - runningEquity) / peak * 100;
      if (x > dd) dd = x;
    });
    maxDD = dd;
  }

  // Profit Target for KPI — same resolution AccountContext already uses
  // (real plan capital + real resolved rule target), computed once here so
  // the KPI row can show it without duplicating AccountContext's internals.
  const equityForTarget = Number.isFinite(Number(selectedAccount.equity)) ? Number(selectedAccount.equity) : kpiCap;
  const profitPct = (kpiCap != null && equityForTarget != null) ? ((equityForTarget - kpiCap) / kpiCap) * 100 : null;
  const kpiRules = getRulesForAccount(selectedAccount, selectedAccount.plans);
  const isFundedPhase = selectedAccount.phase === 'funded' || selectedAccount.status === 'funded';
  const isInstant = selectedAccount.plans?.plan_type === 'INSTANT';
  const resolvedTargetPct = Number.isFinite(Number(kpiRules.profitTargetPct)) ? Number(kpiRules.profitTargetPct) : null;
  const targetPct = (!isInstant && !isFundedPhase && resolvedTargetPct != null && resolvedTargetPct > 0) ? resolvedTargetPct : null;

  return (
    <div className="portal-dashboard">
      {/* Account context lives in the portal topbar (single selector for the
          whole portal). This page renders the dashboard for the selected
          account only. */}

      {/* Main Dashboard Content */}
      <div className="dashboard-sections">
        {/* Section 1: Account Context / Challenge Progress */}
        <section style={{ marginBottom: '20px' }}>
          <AccountContext
            account={selectedAccount}
            plan={selectedAccount.plans}
            trades={trades}
            softBreaches={softBreaches}
          />
        </section>

        {/* Section 2: KPI Row — Account Balance, Today's P&L, Drawdown Used,
            Profit Target. Each card is label + one big number + at most one
            small real status line — nothing else competes with the number. */}
        <section style={{ marginBottom: '20px' }}>
          <KPIRow
            equity={selectedAccount.equity ?? null}
            todayPnl={todayPnl}
            drawdown={maxDD}
            drawdownLimit={selectedAccount.plans?.max_loss ?? null}
            profitPct={profitPct}
            targetPct={targetPct}
            isLoading={loading}
          />
        </section>

        {/* Section 3: Two-rail body — LEFT: the single dominant Account
            Overview card (compact metrics + equity chart). RIGHT: which
            account this is (AccountSummaryCard) + Open Positions. Two
            independent grid cells in one row; neither forces the other's
            height. */}
        <section style={{ marginBottom: '20px' }}>
          <MainPerformanceArea
            account={selectedAccount}
            plan={selectedAccount.plans}
            trades={trades}
            metrics={metrics}
            isLoading={loading}
            secondaryRailExtra={
              <>
                <AccountSummaryCard
                  account={selectedAccount}
                  totalTrades={metrics?.totalTrades ?? 0}
                  tradingDays={metrics?.tradingDays ?? 0}
                  isLoading={loading}
                />
                <OpenPositionsTable
                  positions={transformedPositions}
                  isLoading={loading}
                />
              </>
            }
          />
        </section>

        {/* Section 4/5: lower dashboard as TWO INDEPENDENT VERTICAL COLUMNS,
            not a shared 2-row grid. A shared row sizes both cards in that
            row to the tallest one (Performance Analytics), which left a
            large blank area under the shorter P&L Heatmap before Recent
            Trades could start. Each column here is its own flex stack
            (.content-rail — the same "independent rail" pattern already
            used above for the equity-chart / account-rail split) with its
            own vertical flow; the right column's height never affects
            where the left column's second card begins. */}
        <section
          className="dash-split"
          style={{ gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', marginBottom: '20px' }}
        >
          <div className="content-rail">
            <PnLHeatmap
              data={trades}
              period="1M"
              isLoading={loading}
            />
            <RecentTradesTable
              trades={transformedTrades}
              isLoading={loading}
            />
          </div>
          <div className="content-rail">
            <PerformanceAnalytics
              monthlyReturns={monthlyReturns}
              sharpeRatio={metrics?.sharpeRatio}
              sortinoRatio={metrics?.sortinoRatio}
              calmarRatio={metrics?.calmarRatio}
              maxDrawdown={metrics?.maxDrawdown}
              avgWin={metrics?.avgWin}
              // PerformanceAnalytics' own 'currency' formatter puts the ₹
              // before the sign for a negative number ("₹-150"); the
              // canonical avgLoss is signed (negative), so this magnitude
              // conversion is a presentation-only fix at this one display
              // boundary — the underlying calculation stays canonical.
              avgLoss={metrics?.avgLoss == null ? null : Math.abs(metrics.avgLoss)}
              winRate={metrics?.winRatio}
              profitFactor={metrics?.profitFactor}
              expectancy={metrics?.expectancy}
              kellyCriterion={metrics?.kellyCriterion}
              isLoading={loading}
            />
            <MarketSession
              isLoading={loading}
            />
          </div>
        </section>

        {/* Section 6: Indian Market Status — full width, unchanged real feature. */}
        <section>
          <IndianMarketStatus
            niftyData={marketData.nifty}
            bankNiftyData={marketData.bankNifty}
            finNiftyData={marketData.finNifty}
            marketStatus={marketData.status}
            vix={marketData.vix}
            isLoading={loading}
          />
        </section>
      </div>
    </div>
  );
}
