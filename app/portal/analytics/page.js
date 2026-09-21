'use client';

/* ============================================================
   /portal/analytics  —  Performance analysis workspace

   Account/plan figures  ->  PortalDataProvider (selected account) + lib/accounts
   Trade figures         ->  one trades query for the selected account, RLS-scoped
                             ("trades own read"), summed only over real trades.pnl
   Rule limits           ->  lib/rules getRulesForAccount()  (never hardcoded)

   The ONLY trustworthy trade columns are: pnl, traded_at, instrument, side
   (per supabase/schema.sql). No entry/exit price, qty, strike, expiry,
   option_type — so no CE/PE / strike / premium / greeks analytics.

   "Trade-record P&L" (Σ trades.pnl) and "Account equity P&L"
   (accounts.equity − plans.capital) are shown as separate, labelled figures
   and never forced to match. All-time only.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { getRulesForAccount, getPhaseDisplayLabel } from '@/lib/rules';
import { accountFinancials, getPlanTypeLabel, getStatusMeta } from '@/lib/accounts';
import { formatINR } from '@/lib/format';
import { computeTradeStats, observedMaxDrawdownPct, dailyPnl, pnlByField } from '@/lib/tradeStats';
import EquityCurve from '@/components/portal/dashboard/EquityCurve';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';

const finN = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
function pctStr(v, { sign = false } = {}) {
  const n = finN(v);
  if (n === null) return '—';
  return `${sign && n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function istDateLabel(ymd) {
  // ymd is already an IST YYYY-MM-DD string from lib/tradeStats
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function AnalyticsPage() {
  const { ready, error: ctxError, accounts, selectedAccount, selectAccount } = usePortalData();

  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradesError, setTradesError] = useState('');

  const accountId = selectedAccount?.id || null;

  useEffect(() => {
    // clear the previous account's data before any refetch
    setTrades([]);
    setTradesError('');
    if (!accountId) { setTradesLoading(false); return; }

    setTradesLoading(true);
    let on = true;
    (async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('pnl, traded_at, instrument, side')
        .eq('account_id', accountId)
        .order('traded_at', { ascending: true });
      if (!on) return;
      if (error) setTradesError(error.message);
      setTrades(Array.isArray(data) ? data : []);
      setTradesLoading(false);
    })();
    return () => { on = false; };
  }, [accountId]);

  const plan = selectedAccount?.plans || null;
  const fin = useMemo(() => accountFinancials(selectedAccount, plan), [selectedAccount, plan]);
  const rules = useMemo(
    () => (selectedAccount && plan ? getRulesForAccount(selectedAccount, plan) || {} : {}),
    [selectedAccount, plan],
  );
  const stats = useMemo(() => computeTradeStats(trades), [trades]);
  const daily = useMemo(() => dailyPnl(trades), [trades]);
  const byInstrument = useMemo(() => pnlByField(trades, 'instrument'), [trades]);
  const bySide = useMemo(() => pnlByField(trades, 'side'), [trades]);
  const observedDd = useMemo(
    () => observedMaxDrawdownPct(trades, plan?.capital),
    [trades, plan],
  );

  const planType = plan?.plan_type ?? null;
  const isFunded = selectedAccount?.phase === 'funded' || selectedAccount?.status === 'funded';

  // profit-target progress from canonical rules only
  const targetPct = finN(rules.profitTargetPct);
  const targetProgress = (!isFunded && targetPct != null && targetPct > 0 && fin.pnlPct != null)
    ? Math.max(0, Math.min(100, (fin.pnlPct / targetPct) * 100))
    : null;

  // current drawdown from starting capital (a real, current number — not a historical max)
  const currentDdFromCapital = (fin.capital != null && fin.equity != null && fin.equity < fin.capital)
    ? ((fin.capital - fin.equity) / fin.capital) * 100
    : (fin.capital != null && fin.equity != null ? 0 : null);

  const dayStart = finN(selectedAccount?.day_start_equity);
  const todayPnl = (fin.equity != null && dayStart != null) ? fin.equity - dayStart : null;

  if (!ready) return <div className="portal-dashboard"><DashboardEmptyState type="loading" /></div>;
  if (ctxError) return <div className="portal-dashboard"><DashboardEmptyState type="error" /></div>;

  if (!accounts.length) {
    return (
      <div className="portal-dashboard">
        <PageHeader />
        <div className="card" style={{ padding: '40px 22px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">📊</div>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>No account to analyse</h2>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>
            Analytics works on one of your challenge or funded accounts.
          </p>
          <Link href="/portal/accounts" className="btn btn-grad btn-sm">View Accounts</Link>
        </div>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="portal-dashboard">
        <PageHeader />
        <div className="card" style={{ padding: '36px 22px', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <p className="muted" style={{ margin: '0 0 14px', fontSize: 13.5 }}>Select an account to view analytics.</p>
          <Link href="/portal/accounts" className="btn btn-grad btn-sm">View Accounts</Link>
        </div>
      </div>
    );
  }

  const st = getStatusMeta(selectedAccount.status);
  const noTrades = !tradesLoading && !tradesError && trades.length === 0;

  return (
    <div className="portal-dashboard">
      <PageHeader />

      {/* context strip */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {accounts.length > 1 ? (
            <>
              <label htmlFor="an-account" className="muted" style={{ fontSize: 12.5 }}>Account</label>
              <select
                id="an-account"
                value={selectedAccount.id}
                onChange={(e) => selectAccount(e.target.value)}
                style={{ width: 'auto', padding: '7px 10px', fontSize: 13, background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, color: 'var(--text)' }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.login_id} · {getPlanTypeLabel(a.plans?.plan_type)}</option>
                ))}
              </select>
            </>
          ) : (
            <span style={{ fontWeight: 700, fontFamily: 'Manrope,sans-serif' }}>{selectedAccount.login_id}</span>
          )}
          <span className="muted" style={{ fontSize: 12.5 }}>
            {getPlanTypeLabel(planType)} · {plan?.name || 'Plan —'} · {getPhaseDisplayLabel(planType, selectedAccount.phase)}
          </span>
          <span className={`tag ${st.tag}`} style={{ fontSize: 10 }}>{st.label}</span>
        </div>
        <span className="tag tag-muted" style={{ fontSize: 10 }}>ALL-TIME</span>
      </div>

      {tradesError && (
        <div className="err" style={{ maxWidth: 620 }}>Could not load trades: {tradesError}</div>
      )}

      {/* 1 — performance overview */}
      <SectionTitle>Performance overview</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Kpi label="Account Capital" value={formatINR(fin.capital)} source="plan.capital" />
        <Kpi label="Current Equity" value={formatINR(fin.equity)} source="account equity" />
        <Kpi
          label="Net P&L (equity)"
          value={formatINR(fin.pnl, { sign: true })}
          color={fin.pnl == null ? undefined : fin.pnl >= 0 ? 'var(--green)' : 'var(--red)'}
          source="equity − capital"
        />
        <Kpi
          label="Return"
          value={pctStr(fin.pnlPct, { sign: true })}
          color={fin.pnlPct == null ? undefined : fin.pnlPct >= 0 ? 'var(--green)' : 'var(--red)'}
          source="(equity − capital) ÷ capital"
        />
        <Kpi
          label="Drawdown from capital"
          value={currentDdFromCapital == null ? '—' : `${currentDdFromCapital.toFixed(2)}%`}
          color={currentDdFromCapital ? 'var(--red)' : undefined}
          source="current, from starting capital"
        />
        <Kpi
          label="Profit target progress"
          value={targetProgress == null ? (targetPct == null ? 'Not specified' : (isFunded ? 'Funded' : '—')) : `${targetProgress.toFixed(0)}%`}
          sub={targetPct != null && !isFunded ? `of ${targetPct}% target` : undefined}
          source="rule resolver"
        />
        <Kpi
          label="Today's P&L"
          value={todayPnl == null ? '—' : formatINR(todayPnl, { sign: true })}
          color={todayPnl == null ? undefined : todayPnl >= 0 ? 'var(--green)' : 'var(--red)'}
          source="equity − day_start_equity"
        />
        <Kpi
          label="Recorded trades"
          value={tradesLoading ? '…' : String(stats.total)}
          source="trades rows"
        />
      </div>

      {/* 2 — trade-record equity curve */}
      <SectionTitle>Trade-record equity curve</SectionTitle>
      <div className="card" style={{ padding: 0, marginBottom: 8 }}>
        <EquityCurve
          data={trades}
          capital={plan?.capital ?? null}
          currentEquity={fin.equity}
          height={320}
          isLoading={tradesLoading}
        />
      </div>
      <p className="muted" style={{ fontSize: 11.5, margin: '0 0 20px', lineHeight: 1.5, maxWidth: 680 }}>
        Starts at plan capital and applies each recorded trade&apos;s realised P&L in <code>traded_at</code> order.
        Your authoritative account equity is <b style={{ color: 'var(--text)' }}>{formatINR(fin.equity)}</b> — it may
        differ from the curve&apos;s end value if it carries adjustments not stored as trade rows. Historical equity
        snapshots are not stored, so the curve is only as complete as the trade records.
      </p>

      {/* 3 — trade statistics */}
      <SectionTitle right="Based on recorded trades">Trade statistics</SectionTitle>
      {tradesLoading ? (
        <SkeletonGrid n={8} />
      ) : noTrades ? (
        <EmptyCard>No completed trade data available yet for this account.</EmptyCard>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <Kpi label="Total trades" value={String(stats.total)} />
            <Kpi label="Winning" value={String(stats.wins)} color="var(--green)" />
            <Kpi label="Losing" value={String(stats.losses)} color="var(--red)" />
            <Kpi label="Break-even" value={String(stats.breakEven)} />
            <Kpi label="Win rate" value={stats.winRate == null ? '—' : `${stats.winRate.toFixed(1)}%`} sub={stats.winRate == null ? undefined : 'of decided trades'} />
            <Kpi label="Avg win" value={stats.avgWin == null ? '—' : formatINR(stats.avgWin, { sign: true })} color="var(--green)" />
            <Kpi label="Avg loss" value={stats.avgLoss == null ? '—' : formatINR(stats.avgLoss, { sign: true })} color="var(--red)" />
            <Kpi
              label="Total trade-record P&L"
              value={formatINR(stats.netPnl, { sign: true })}
              color={stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)'}
              sub="Σ trades.pnl"
            />
            <Kpi label="Best trade" value={stats.bestTrade == null ? '—' : formatINR(stats.bestTrade, { sign: true })} color="var(--green)" />
            <Kpi label="Worst trade" value={stats.worstTrade == null ? '—' : formatINR(stats.worstTrade, { sign: true })} color="var(--red)" />
            <Kpi label="Profit factor" value={stats.profitFactor == null ? '—' : stats.profitFactor.toFixed(2)} sub={stats.profitFactor == null ? 'no losing trades' : 'gross profit ÷ gross loss'} />
            <Kpi label="Expectancy / trade" value={stats.expectancy == null ? '—' : formatINR(stats.expectancy, { sign: true })} />
          </div>
          {stats.netPnl !== fin.pnl && fin.pnl != null && (
            <p className="muted" style={{ fontSize: 11.5, margin: '0 0 20px', lineHeight: 1.5 }}>
              Note: total trade-record P&L ({formatINR(stats.netPnl, { sign: true })}) differs from account-equity P&L
              ({formatINR(fin.pnl, { sign: true })}). Account equity is authoritative; the difference is not captured
              as trade rows.
            </p>
          )}
        </>
      )}

      {/* 4 — win / loss analysis */}
      <SectionTitle>Winning vs losing</SectionTitle>
      {tradesLoading ? (
        <SkeletonGrid n={3} />
      ) : noTrades ? (
        <EmptyCard>No completed trade data available.</EmptyCard>
      ) : (
        <WinLoss stats={stats} />
      )}

      {/* 5 — risk & drawdown */}
      <SectionTitle>Risk &amp; drawdown</SectionTitle>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="tag tag-blue" style={{ fontSize: 10 }}>RULE LIMIT</span>
          <span className="tag tag-muted" style={{ fontSize: 10 }}>OBSERVED — recorded trades</span>
        </div>
        <RiskRow label="Maximum drawdown (rule limit)" value={pctStr(finN(rules.maximumDrawdownPct))} note={rules.maximumDrawdownIsTrailing ? 'Trailing from peak equity.' : (finN(rules.maximumDrawdownPct) != null ? 'From starting balance.' : undefined)} />
        <RiskRow label="Daily drawdown (rule limit)" value={pctStr(finN(rules.dailyDrawdownPct))} note={rules.dailyDrawdownIsTrailing ? 'Trailing from the day’s peak.' : undefined} />
        <RiskRow label="Observed max drawdown" value={observedDd == null ? '—' : `${observedDd.toFixed(2)}%`} note="From the trade-record equity curve only — not a verified complete history." />
        <RiskRow label="Current drawdown from capital" value={currentDdFromCapital == null ? '—' : `${currentDdFromCapital.toFixed(2)}%`} note="How far current equity sits below starting capital right now." />
        <RiskRow label="Today (equity vs day start)" value={todayPnl == null ? '—' : formatINR(todayPnl, { sign: true })} note="From account fields; resets each trading day." />
      </div>

      {/* 6 — daily performance */}
      <SectionTitle right="IST trading day · recorded trades">Daily performance</SectionTitle>
      {tradesLoading ? (
        <SkeletonGrid n={4} />
      ) : daily.length === 0 ? (
        <EmptyCard>No dated trade activity to aggregate.</EmptyCard>
      ) : (
        <div className="card" style={{ padding: 0, marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>Date (IST)</th>
                  <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Trades</th>
                  <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Daily P&L</th>
                </tr>
              </thead>
              <tbody>
                {daily.slice(0, 60).map((d) => (
                  <tr key={d.date}>
                    <td style={tdStyle}>{istDateLabel(d.date)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.trades}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {formatINR(d.pnl, { sign: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {daily.length > 60 && (
            <div className="muted" style={{ fontSize: 11.5, padding: '10px 14px' }}>Showing the 60 most recent trading days.</div>
          )}
        </div>
      )}

      {/* 7 — instrument & side breakdown */}
      <SectionTitle right="Recorded instrument / side text only">Instrument &amp; side breakdown</SectionTitle>
      {tradesLoading ? (
        <SkeletonGrid n={2} />
      ) : noTrades ? (
        <EmptyCard>No trades to break down.</EmptyCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
          <BreakdownCard title="P&L by instrument" rows={byInstrument} />
          <BreakdownCard title="P&L by side" rows={bySide} />
        </div>
      )}

      {/* 8 — advanced metrics (honest gap) */}
      <SectionTitle>Advanced metrics</SectionTitle>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
          Risk-adjusted metrics (Sharpe, Sortino, Calmar, consistency score) need a time-based return series with a
          defensible risk-free and periodicity basis. The current data — realised trade P&L without position sizing,
          entry/exit prices or reliable historical equity snapshots — does not support them, so no number is shown.
          Profit factor and expectancy above are the metrics the trade records can support directly.
        </p>
      </div>

      {/* 9 — data limitations */}
      <SectionTitle>Data limitations</SectionTitle>
      <div className="card" style={{ padding: 16 }}>
        <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>Trades store only <code>pnl</code>, <code>traded_at</code>, <code>instrument</code> and <code>side</code>. No entry/exit price, quantity, strike, expiry or option type — so no CE/PE, strike, premium, greeks, IV or R-multiple analytics.</li>
          <li>Trade-record P&L (Σ <code>trades.pnl</code>) and account-equity P&L (<code>equity − capital</code>) can differ; account equity is authoritative.</li>
          <li>Historical equity is not snapshotted — the curve and observed drawdown reflect recorded trades only.</li>
          <li>All figures are all-time. Period filters (7D/30D/90D) are not offered because per-period aggregation can&apos;t be reconciled with admin-adjusted equity.</li>
          <li>Daily grouping uses the IST (Asia/Kolkata) calendar day of <code>traded_at</code>.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function PageHeader() {
  return (
    <div style={{ marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Analytics</h1>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: 620, lineHeight: 1.6 }}>
        Detailed all-time performance analytics for your selected account, from account records and recorded trades.
      </p>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, margin: '4px 0 10px' }}>
      <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>{children}</h2>
      {right && <span className="muted" style={{ fontSize: 11 }}>{right}</span>}
    </div>
  );
}

function Kpi({ label, value, sub, color, source }) {
  return (
    <div className="card" style={{ padding: '12px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>{label}</span>
      <span style={{ fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 'clamp(14px,1.6vw,18px)', lineHeight: 1.1, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</span>
      {sub && <span className="muted" style={{ fontSize: 10 }}>{sub}</span>}
      {source && <span className="dim" style={{ fontSize: 9, letterSpacing: '.02em' }}>{source}</span>}
    </div>
  );
}

function WinLoss({ stats }) {
  const total = stats.total || 0;
  const seg = (n) => (total > 0 ? (n / total) * 100 : 0);
  const rows = [
    { label: 'Winning', n: stats.wins, pnl: stats.grossProfit, color: 'var(--green)' },
    { label: 'Break-even', n: stats.breakEven, pnl: 0, color: 'var(--muted)' },
    { label: 'Losing', n: stats.losses, pnl: -stats.grossLoss, color: 'var(--red)' },
  ];
  return (
    <div className="card" style={{ padding: 16, marginBottom: 20 }}>
      <div
        role="img"
        aria-label={`Winning ${stats.wins} trades, break-even ${stats.breakEven}, losing ${stats.losses}, of ${total} total`}
        style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', background: 'var(--bg2)', marginBottom: 14 }}
      >
        <span style={{ width: `${seg(stats.wins)}%`, background: 'var(--green)' }} />
        <span style={{ width: `${seg(stats.breakEven)}%`, background: 'var(--dim)' }} />
        <span style={{ width: `${seg(stats.losses)}%`, background: 'var(--red)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ borderLeft: `2px solid ${r.color}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{r.label}</div>
            <div className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              {r.n} trade{r.n === 1 ? '' : 's'} · {total > 0 ? `${((r.n / total) * 100).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: r.label === 'Break-even' ? 'var(--text)' : r.color }}>
              {r.label === 'Break-even' ? '—' : formatINR(r.pnl, { sign: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskRow({ label, value, note }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px', padding: '10px 0', borderTop: '1px dashed var(--line)', alignItems: 'baseline' }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'Manrope,sans-serif', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {note && <span className="muted" style={{ fontSize: 11, gridColumn: '1 / -1' }}>{note}</span>}
    </div>
  );
}

function BreakdownCard({ title, rows }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 700 }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 260 }}>
          <thead>
            <tr>
              <th scope="col" style={thStyle}>Key</th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Trades</th>
              <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Net P&L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.key}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.trades}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: r.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatINR(r.pnl, { sign: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonGrid({ n }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card" style={{ height: 74, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

function EmptyCard({ children }) {
  return (
    <div className="card" style={{ padding: '24px 18px', textAlign: 'center', marginBottom: 20 }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{children}</p>
    </div>
  );
}

const thStyle = {
  textAlign: 'left', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.1em',
  textTransform: 'uppercase', color: 'var(--muted)', padding: '10px 14px',
  borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '11px 14px', borderBottom: '1px solid rgba(34,197,139,0.06)',
  fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap',
};
