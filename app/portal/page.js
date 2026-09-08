'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AccountSelector from '@/components/portal/dashboard/AccountSelector';
import KPIRow from '@/components/portal/dashboard/KPIRow';
import MainPerformanceArea from '@/components/portal/dashboard/MainPerformanceArea';
import OpenPositionsTable from '@/components/portal/dashboard/OpenPositionsTable';
import RecentTradesTable from '@/components/portal/dashboard/RecentTradesTable';
import IndianMarketStatus from '@/components/portal/dashboard/IndianMarketStatus';
import PnLHeatmap from '@/components/portal/dashboard/PnLHeatmap.jsx';
import PerformanceAnalytics from '@/components/portal/dashboard/PerformanceAnalytics';
import QuickActions from '@/components/portal/dashboard/QuickActions';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';
import AccountContext from '@/components/portal/dashboard/AccountContext';
import MarketSession from '@/components/portal/dashboard/MarketSession';

export default function PortalPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [trades, setTrades] = useState([]);
  const [positions, setPositions] = useState([]);
  const [profile, setProfile] = useState(null);
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
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const [{ data: prof }, { data: accs }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          supabase.from('accounts').select('*, plans(*)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        ]);
        
        if (!mounted) return;
        setProfile(prof);
        setAccounts(accs || []);
        if (accs?.length) {
          const firstAcc = accs[0];
          setSelectedAccountId(firstAcc.id);
          setSelectedAccount(firstAcc);
        }
        setError(null);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Clear the previous account's per-account data before (re)fetching so the
    // dashboard never shows one account's trades/positions/metrics under another
    // account's header during the fetch.
    setTrades([]);
    setPositions([]);
    setMonthlyReturns([]);
    setSoftBreaches({});

    if (!selectedAccount) return;

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

        // Fetch open positions
        const { data: positionsData } = await supabase
          .from('positions')
          .select('*')
          .eq('account_id', selectedAccount.id)
          .eq('status', 'OPEN');
        
        if (!mounted) return;
        setPositions(positionsData || []);

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

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const hasLosses = losses.length > 0;
    const grossW = wins.reduce((s, t) => s + t.pnl, 0);
    const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const winRatio = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? grossW / wins.length : 0;
    const avgLoss = hasLosses ? grossL / losses.length : 0;
    // Profit factor is undefined (no denominator) when there are no losing trades.
    const pf = grossL > 0 ? grossW / grossL : null;
    const totalTrades = trades.length;
    const tradingDays = new Set(trades.map(t => new Date(t.traded_at).toDateString())).size;
    const bestTrade = wins.length ? Math.max(...wins.map(t => t.pnl)) : null;
    const worstTrade = hasLosses ? Math.min(...losses.map(t => t.pnl)) : null;

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

    // Expectancy
    const expectancy = totalTrades > 0 ? (winRatio/100 * avgWin) - ((100-winRatio)/100 * avgLoss) : 0;

    // Kelly Criterion — needs a real win/loss payoff ratio. If there are no
    // losing trades the payoff ratio is unknown → Kelly is N/A (no fallback).
    const kellyCriterion = avgLoss > 0
      ? (() => { const winProb = winRatio / 100; return (winProb - (1 - winProb) / (avgWin / avgLoss)) * 100; })()
      : null;

    return {
      equity: equity,
      todayPnl: trades.filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString()).reduce((s, t) => s + t.pnl, 0),
      avgWin: wins.length ? avgWin : null,
      avgLoss: hasLosses ? avgLoss : null,
      winRatio,
      profitFactor: pf,
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      bestTrade,
      worstTrade,
      tradingDays,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: maxDD == null ? null : (maxDD > 0 ? -maxDD : 0),
      expectancy,
      kellyCriterion,
    };
  }

  const metrics = computeMetrics();

  function handleAccountChange(accountId) {
    const account = accounts.find(a => a.id === accountId);
    setSelectedAccountId(accountId);
    setSelectedAccount(account);
  }

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
        onSelectAccount={() => setSelectedAccountId(accounts[0].id)}
      />
    );
  }

  if (!trades.length && !positions.length) {
    return (
      <div className="portal-dashboard">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={handleAccountChange}
            onNewChallenge={handleNewChallenge}
            loading={loading}
          />
        </div>
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

  // Transform trades for RecentTradesTable component
  const transformedTrades = trades
    .filter(t => t.exit_price || t.pnl !== 0) // Closed trades
    .slice(-20)
    .reverse()
    .map(t => ({
      id: t.id,
      symbol: t.symbol,
      type: t.type || null,
      side: t.side,
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

  return (
    <div className="portal-dashboard">
      {/* Account selector — single account-context control */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={handleAccountChange}
          onNewChallenge={handleNewChallenge}
          loading={loading}
        />
      </div>

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

        {/* Section 2: KPI Row - 4 Compact Premium Cards */}
        <section style={{ marginBottom: '20px' }}>
          <KPIRow
            capital={selectedAccount.plans?.capital ?? null}
            equity={selectedAccount.equity ?? null}
            todayPnl={todayPnl}
            drawdown={maxDD}
            drawdownLimit={selectedAccount.plans?.max_loss ?? null}
            isLoading={loading}
          />
        </section>

        {/* Section 3: Two-rail body. The left rail (chart, positions, trades,
            analytics) and the right rail (account overview, metrics, details,
            quick actions) are two independent grid cells in ONE grid row with
            align-items:start — neither forces the other's height, and nothing
            full-width sits between them waiting on the taller rail. */}
        <section style={{ marginBottom: '20px' }}>
          <MainPerformanceArea
            account={selectedAccount}
            plan={selectedAccount.plans}
            trades={trades}
            metrics={metrics}
            isLoading={loading}
            primaryRailExtra={
              <>
                <OpenPositionsTable
                  positions={transformedPositions}
                  isLoading={loading}
                />
                <RecentTradesTable
                  trades={transformedTrades}
                  isLoading={loading}
                />
                <PnLHeatmap
                  data={trades}
                  period="1M"
                  isLoading={loading}
                />
                <PerformanceAnalytics
                  monthlyReturns={monthlyReturns}
                  sharpeRatio={metrics?.sharpeRatio}
                  sortinoRatio={metrics?.sortinoRatio}
                  calmarRatio={metrics?.calmarRatio}
                  maxDrawdown={metrics?.maxDrawdown}
                  avgWin={metrics?.avgWin}
                  avgLoss={metrics?.avgLoss}
                  winRate={metrics?.winRatio}
                  profitFactor={metrics?.profitFactor}
                  expectancy={metrics?.expectancy}
                  kellyCriterion={metrics?.kellyCriterion}
                  isLoading={loading}
                />
              </>
            }
            secondaryRailExtra={
              <QuickActions
                disabledActions={!selectedAccount ? ['terminal', 'payout'] : []}
                isLoading={loading}
              />
            }
          />
        </section>

        {/* Section 4: Indian Market Status — full width */}
        <section style={{ marginBottom: '20px' }}>
          <IndianMarketStatus
            niftyData={marketData.nifty}
            bankNiftyData={marketData.bankNifty}
            finNiftyData={marketData.finNifty}
            marketStatus={marketData.status}
            vix={marketData.vix}
            isLoading={loading}
          />
        </section>

        {/* Section 5: Market Session */}
        <section>
          <MarketSession
            isLoading={loading}
          />
        </section>
      </div>
    </div>
  );
}