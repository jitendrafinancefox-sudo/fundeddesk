'use client';

/* ============================================================
   /portal/accounts/[id]  —  Account detail

   The account itself comes from the portal-wide context (no refetch of
   the accounts list). Per-account trades / positions / soft breaches are
   fetched here, keyed on the id, and fully cleared before each refetch so
   account A's data can never flash under account B.

   Opening this page also sets the portal-wide selected account, keeping
   Home / Rules / Terminal / topbar selector in sync.

   Reuses the approved dashboard components — it does NOT rebuild the Home
   dashboard.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, LineChart, ScrollText, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { getRulesForAccount, getPhaseDisplayLabel } from '@/lib/rules';
import { formatNumber, formatINR } from '@/lib/format';
import { getPlanTypeLabel, getStatusMeta, isFunded } from '@/lib/accounts';
import { evaluateAccountRisk, sumTradePnlOnLocalDay } from '@/lib/riskEngine';
import KPIRow from '@/components/portal/dashboard/KPIRow';
import AccountContext from '@/components/portal/dashboard/AccountContext';
import OpenPositionsTable from '@/components/portal/dashboard/OpenPositionsTable';
import RecentTradesTable from '@/components/portal/dashboard/RecentTradesTable';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { ready, accounts, selectAccount } = usePortalData();

  const account = useMemo(() => accounts.find((a) => a.id === id) || null, [accounts, id]);
  const plan = account?.plans || null;

  const [trades, setTrades] = useState([]);
  const [positions, setPositions] = useState([]);
  const [softBreaches, setSoftBreaches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync the portal-wide selection to whatever account is being viewed.
  useEffect(() => {
    if (account) selectAccount(account.id);
  }, [account, selectAccount]);

  // Per-account data — cleared first, then refetched. Never stale.
  useEffect(() => {
    setTrades([]);
    setPositions([]);
    setSoftBreaches({});
    setError(null);

    if (!account) { setLoading(false); return; }

    setLoading(true);
    let on = true;
    (async () => {
      try {
        // Open positions: no persistent production positions table exists
        // and nothing would ever write to one — see app/portal/page.js for
        // the full rationale. `positions` stays the empty array it was
        // cleared to above.
        const [{ data: tr }, { data: br }] = await Promise.all([
          supabase.from('trades').select('*').eq('account_id', account.id).order('traded_at', { ascending: true }),
          supabase.from('soft_breaches').select('rule_type, breach_count, last_breach_at').eq('account_id', account.id),
        ]);
        if (!on) return;
        setTrades(tr || []);
        const map = {};
        (br || []).forEach((row) => { map[row.rule_type] = { count: row.breach_count, lastBreachAt: row.last_breach_at }; });
        setSoftBreaches(map);
      } catch (e) {
        if (on) setError(e?.message || 'Failed to load account data.');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [account]);

  // ---- derived, real fields only ----
  const capRaw = Number(plan?.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
  const equityRaw = Number(account?.equity);
  const equity = Number.isFinite(equityRaw) ? equityRaw : (cap ?? null);

  // Canonical risk read-out — ONE evaluator (lib/riskEngine), pure, indicative
  // only. KPI figures below are sourced from it so nothing is re-derived here.
  const risk = useMemo(
    () => (account && plan ? evaluateAccountRisk(account, plan, { trades, softBreaches }) : null),
    [account, plan, trades, softBreaches],
  );

  const todayPnl = sumTradePnlOnLocalDay(trades);
  const maxDD = risk?.drawdown.observedMaxDrawdownPct ?? null;

  const rules = account && plan ? getRulesForAccount(account, plan) : null;
  const planType = plan?.plan_type ?? null;
  const funded = account ? isFunded(account) : false;

  const transformedPositions = positions.map((p) => ({
    id: p.id, symbol: p.symbol, kind: p.kind || null, side: p.side, qty: p.qty,
    avgPrice: p.avg_price || p.entry_price, currentPrice: p.current_price || p.avg_price || p.entry_price,
    pnl: p.pnl || 0, pnlPct: p.pnl_pct || 0, strike: p.strike, expiry: p.expiry,
    option_type: p.option_type, underlying: p.underlying,
  }));

  // Every public.trades row is already a closed/realized ledger event
  // (Phase 11) — there is no production exit_price to filter on, and a
  // legitimate pnl = 0 trade must still appear here.
  const transformedTrades = trades
    .slice(-20).reverse()
    .map((t) => ({
      id: t.id, symbol: t.symbol, type: t.type || null, side: t.side,
      entryPrice: t.entry_price, exitPrice: t.exit_price, pnl: t.pnl,
      pnlPct: t.pnl_pct || (t.entry_price ? (t.pnl / Math.abs(t.entry_price * t.qty)) * 100 : 0),
      tradedAt: t.traded_at, strike: t.strike, expiry: t.expiry, option_type: t.option_type,
    }));

  // ---- states ----
  if (!ready) return <div className="portal-dashboard"><DashboardEmptyState type="loading" /></div>;

  if (!account) {
    return (
      <div className="portal-dashboard">
        <Link href="/portal/accounts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to Accounts
        </Link>
        <div className="card" style={{ textAlign: 'center', padding: 44 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Account not found</h2>
          <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px' }}>
            This account isn’t on your profile, or it may have been removed.
          </p>
          <Link href="/portal/accounts" className="btn btn-grad btn-sm">View all accounts</Link>
        </div>
      </div>
    );
  }

  const st = getStatusMeta(account.status);

  return (
    <div className="portal-dashboard">
      <Link href="/portal/accounts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        <ArrowLeft size={14} /> Back to Accounts
      </Link>

      {/* header + actions */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--grad)', display: 'grid', placeItems: 'center', fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 16, color: '#040806', flexShrink: 0 }}>
            {(account.login_id || 'T')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, fontFamily: "'Unbounded','Manrope',sans-serif", letterSpacing: '-0.02em' }}>{account.login_id || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span className="tag tag-blue" style={{ fontSize: 10 }}>{getPlanTypeLabel(planType)}</span>
              <span className="muted" style={{ fontSize: 12 }}>{plan?.name || 'Plan unavailable'}</span>
              <span className="muted" style={{ fontSize: 12 }}>· {getPhaseDisplayLabel(planType, account.phase)}</span>
              <span className={`tag ${st.tag}`} style={{ fontSize: 10 }}>{st.label}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(account.status === 'active' || funded) && (
            <Link href="/portal/terminal" className="btn btn-grad btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LineChart size={14} /> Open Terminal
            </Link>
          )}
          <Link href="/rules" className="btn btn-line btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ScrollText size={14} /> View Rules
          </Link>
          {funded && (
            <Link href="/portal/payouts" className="btn btn-line btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={14} /> Request Payout
            </Link>
          )}
        </div>
      </div>

      {/* KPI row — real columns / derived-from-real only */}
      <div style={{ marginBottom: 16 }}>
        <KPIRow
          capital={cap}
          equity={equity}
          todayPnl={loading ? null : todayPnl}
          drawdown={loading ? null : maxDD}
          drawdownLimit={Number.isFinite(Number(rules?.maximumDrawdownPct)) ? Number(rules.maximumDrawdownPct) : null}
          isLoading={loading}
        />
      </div>

      {error && (
        <div className="card" style={{ padding: 16, marginBottom: 16, border: '1px solid rgba(240,82,95,.25)', background: 'rgba(240,82,95,.06)' }}>
          <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Account context: overview identity, progress toward target, phase
          progression, rule health — all via lib/rules, no duplicated logic */}
      {loading ? (
        <div className="card" style={{ padding: 28, textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
          <span className="muted" style={{ fontSize: 13 }}>Loading account performance…</span>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <AccountContext account={account} plan={plan} trades={trades} softBreaches={softBreaches} />
        </div>
      )}

      {/* Resolved rules summary — presentation only, values straight from
          getRulesForAccount(); "—" where the resolver has no value */}
      {!loading && rules && (
        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Current Rules</h3>
            <Link href="/rules" style={{ fontSize: 12, color: 'var(--brand)' }}>Full rulebook →</Link>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
            <RuleStat label="Profit Target" value={pctOrDash(rules.profitTargetPct)} />
            <RuleStat label="Daily Drawdown" value={pctOrDash(rules.dailyDrawdownPct)} />
            <RuleStat label="Max Drawdown" value={pctOrDash(rules.maximumDrawdownPct)} />
            <RuleStat label="Min Trade Duration" value={secOrDash(rules.minimumTradeDurationSeconds)} />
            <RuleStat label="Inactivity Limit" value={dayOrDash(rules.inactivityDays)} />
            <RuleStat label="Position Stacking" value={numOrDash(rules.positionStackingLimit)} />
            <RuleStat label="Profitable Days" value={numOrDash(rules.profitableTradingDays)} />
            <RuleStat label="Profit Split" value={pctOrDash(rules.profitSplitPct)} />
            <RuleStat label="Payout Cycle" value={dayOrDash(rules.payoutCycleDays)} />
            <RuleStat label="Stop Loss Required" value={rules.stopLossRequired == null ? '—' : rules.stopLossRequired ? 'Yes' : 'No'} />
            <RuleStat label="Weekend Trading" value={rules.weekendTrading == null ? '—' : rules.weekendTrading ? 'Allowed' : 'Not allowed'} />
            <RuleStat label="News Trading" value={rules.newsTrading == null ? '—' : rules.newsTrading ? 'With limits' : 'Not allowed'} />
          </div>
        </div>
      )}

      {/* Risk evaluation — indicative, from the canonical evaluator */}
      {!loading && risk && <RiskEvaluationCard risk={risk} />}

      {/* Trading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <OpenPositionsTable positions={transformedPositions} isLoading={loading} />
        <RecentTradesTable trades={transformedTrades} isLoading={loading} />
        {!loading && !transformedTrades.length && !transformedPositions.length && (
          <div className="card" style={{ padding: '22px', textAlign: 'center' }}>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>No trading activity on this account yet.</p>
            <Link href="/portal/terminal" className="btn btn-grad btn-sm">Open Terminal →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function RuleStat({ label, value }) {
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div className="eyebrow" style={{ fontSize: '9px', letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

const finN = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
function pctOrDash(v) { const n = finN(v); return n == null ? '—' : `${n}%`; }
function numOrDash(v) { const n = finN(v); return n == null ? '—' : formatNumber(n); }
function dayOrDash(v) { const n = finN(v); return n == null ? '—' : `${n} day${n === 1 ? '' : 's'}`; }
function secOrDash(v) { const n = finN(v); return n == null ? '—' : `${n}s`; }
function pct1(v) { const n = finN(v); return n == null ? '—' : `${n.toFixed(2)}%`; }

/**
 * Read-only presentation of evaluateAccountRisk(). Deliberately NOT styled as
 * a live/automated widget: this is a decision-support read-out, the verdict is
 * indicative, and enforcement is done by operations, not by this page.
 */
function RiskEvaluationCard({ risk }) {
  const { capital, drawdown, target, profitableDays, activity, softBreaches, evaluation, reconciliation, dataGaps } = risk;

  const verdictTone = evaluation.breached ? 'var(--red)' : evaluation.passed === true ? 'var(--green)' : 'var(--muted)';
  const verdictText = evaluation.breached
    ? 'Breach condition present'
    : evaluation.passed === true
      ? 'Pass conditions met — pending operations review'
      : risk.meta.fundedStage
        ? 'Funded account — no pass/fail evaluation'
        : 'Within limits — target not yet met';

  return (
    <div className="card" style={{ padding: 0, marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Risk Evaluation</h3>
        <span className="muted" style={{ fontSize: 10.5 }}>Indicative · reviewed and applied by operations, not automated</span>
      </div>

      <div style={{ padding: 14 }}>
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: verdictTone, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: verdictTone }}>{verdictText}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          <RuleStat label="Net P&L" value={capital.netPnl == null ? '—' : formatINR(capital.netPnl, { sign: true })} />
          <RuleStat label="Return" value={pct1(capital.returnPct)} />
          <RuleStat
            label="Max Drawdown (observed)"
            value={drawdown.observedMaxDrawdownPct == null
              ? '—'
              : `${drawdown.observedMaxDrawdownPct.toFixed(2)}%${drawdown.maxDrawdownLimitPct != null ? ` / ${drawdown.maxDrawdownLimitPct}%` : ''}`}
          />
          <RuleStat
            label="Profit Target"
            value={target.profitTargetPct == null
              ? 'No target this phase'
              : `${(target.profitTargetProgressPct ?? 0).toFixed(0)}% of ${target.profitTargetPct}%`}
          />
          <RuleStat
            label="Profitable Days"
            value={profitableDays.required == null ? `${profitableDays.observed}` : `${profitableDays.observed} / ${profitableDays.required}`}
          />
          <RuleStat
            label="Inactivity"
            value={activity.daysSinceLastTrade == null
              ? '—'
              : `${activity.daysSinceLastTrade}d${activity.inactivityLimitDays != null ? ` / ${activity.inactivityLimitDays}d` : ''}`}
          />
          <RuleStat
            label="Soft Breaches"
            value={softBreaches.limit == null ? `${softBreaches.total}` : `${softBreaches.total} / ${softBreaches.limit}`}
          />
          <RuleStat
            label="Daily P&L (IST, ref only)"
            value={drawdown.dailyPnl == null ? '—' : formatINR(drawdown.dailyPnl, { sign: true })}
          />
        </div>

        {evaluation.breachReasons.length > 0 && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {evaluation.breachReasons.map((r) => (
              <li key={r.code} style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}>
                {r.label} <span className="muted" style={{ fontSize: 10.5 }}>· basis: {r.basis}</span>
              </li>
            ))}
          </ul>
        )}

        {!evaluation.breached && evaluation.passBlockers.length > 0 && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {evaluation.passBlockers.map((b) => (
              <li key={b.code} className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{b.label}</li>
            ))}
          </ul>
        )}

        {evaluation.warnings.length > 0 && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {evaluation.warnings.map((w) => (
              <li key={w.code} style={{ fontSize: 12, color: 'var(--gold)', lineHeight: 1.5 }}>{w.label}</li>
            ))}
          </ul>
        )}

        {reconciliation.matches === false && (
          <p className="muted" style={{ fontSize: 11.5, margin: '12px 0 0', lineHeight: 1.5 }}>
            Reconciliation: account equity is {formatINR(reconciliation.impliedEquity, { decimals: 0 })} implied by capital + trade P&L,
            recorded as {formatINR(capital.currentEquity, { decimals: 0 })} (delta {formatINR(reconciliation.equityDelta, { sign: true })}).
            Equity carries operations adjustments; neither value is changed here.
          </p>
        )}

        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', cursor: 'pointer' }}>
            What this evaluation cannot see
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {dataGaps.map((g) => (
              <li key={g.code} className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>{g.label}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
