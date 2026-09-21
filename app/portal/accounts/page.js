'use client';

/* ============================================================
   /portal/accounts  —  Account management workspace

   Reads accounts from the ONE portal-wide context (PortalDataProvider).
   No second account fetch, no second selector, no second context.
   Only real columns are shown; anything missing renders as "—".
   Lifecycle tabs render only when they contain real data.
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ArrowUpRight, LineChart, ScrollText, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { getRulesForAccount, getPhaseDisplayLabel } from '@/lib/rules';
import { formatINR, formatPct } from '@/lib/format';
import {
  getPlanTypeLabel, getStatusMeta, getLifecycle, isFunded, accountFinancials,
} from '@/lib/accounts';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';

const LIFECYCLE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'challenge', label: 'Challenge' },
  { key: 'funded', label: 'Funded' },
  { key: 'instant', label: 'Instant' },
  { key: 'pending', label: 'Pending' },
];

function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* profit-target progress from resolved rules — null when the phase has no target */
function targetProgress(account, plan) {
  const { pnlPct } = accountFinancials(account, plan);
  if (!plan || pnlPct == null) return null;
  const rules = getRulesForAccount(account, plan);
  const target = Number(rules?.profitTargetPct);
  if (!Number.isFinite(target) || target <= 0 || isFunded(account)) return null;
  return { pct: Math.min(100, Math.max(0, (pnlPct / target) * 100)), target };
}

export default function AccountsPage() {
  const router = useRouter();
  const { ready, accounts, userId, selectAccount } = usePortalData();

  const [tab, setTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // Pending = paid orders awaiting account activation (real `orders` table).
  useEffect(() => {
    if (!userId) return;
    let on = true;
    (async () => {
      setPendingLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!on) return;
      if (!error) setPendingOrders(data || []);
      setPendingLoading(false);
    })();
    return () => { on = false; };
  }, [userId]);

  const buckets = useMemo(() => {
    const b = { challenge: [], funded: [], instant: [] };
    for (const a of accounts) b[getLifecycle(a, a.plans)].push(a);
    return b;
  }, [accounts]);

  const visibleTabs = LIFECYCLE_TABS.filter((t) => {
    if (t.key === 'all') return true;
    if (t.key === 'pending') return pendingOrders.length > 0;
    return buckets[t.key]?.length > 0;
  });

  // keep the active tab valid if its data disappears
  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === tab)) setTab('all');
  }, [visibleTabs, tab]);

  const tabAccounts = tab === 'all' || tab === 'pending' ? accounts : buckets[tab] || [];

  const statusesPresent = useMemo(() => {
    const s = new Set(tabAccounts.map((a) => a.status).filter(Boolean));
    return ['all', ...['active', 'breached', 'passed', 'funded'].filter((x) => s.has(x))];
  }, [tabAccounts]);

  useEffect(() => {
    if (!statusesPresent.includes(statusFilter)) setStatusFilter('all');
  }, [statusesPresent, statusFilter]);

  const rows = tabAccounts.filter((a) => statusFilter === 'all' || a.status === statusFilter);

  // ---- summary strip (real sums only) ----
  const summary = useMemo(() => {
    let capital = 0, equity = 0, pnl = 0, capHas = false, eqHas = false;
    for (const a of accounts) {
      const f = accountFinancials(a, a.plans);
      if (f.capital != null) { capital += f.capital; capHas = true; }
      if (f.equity != null) { equity += f.equity; eqHas = true; }
      if (f.pnl != null) pnl += f.pnl;
    }
    return {
      total: accounts.length,
      active: accounts.filter((a) => a.status === 'active').length,
      funded: accounts.filter((a) => isFunded(a)).length,
      capital: capHas ? capital : null,
      equity: eqHas ? equity : null,
      pnl: capHas && eqHas ? pnl : null,
    };
  }, [accounts]);

  if (!ready) {
    return <div className="portal-dashboard"><DashboardEmptyState type="loading" /></div>;
  }

  if (!accounts.length && !pendingOrders.length && !pendingLoading) {
    return (
      <div className="portal-dashboard">
        <DashboardEmptyState type="no-account" onCreateAccount={() => router.push('/challenges')} />
      </div>
    );
  }

  return (
    <div className="portal-dashboard">
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Accounts</h1>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Every challenge and funded account on your profile.</p>
        </div>
        <Link href="/challenges" className="btn btn-grad btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New Challenge
        </Link>
      </div>

      {/* summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }} className="accounts-summary">
        <SummaryCard label="Accounts" value={String(summary.total)} sub={`${summary.active} active · ${summary.funded} funded`} />
        <SummaryCard label="Total Capital" value={formatINR(summary.capital)} />
        <SummaryCard label="Total Equity" value={formatINR(summary.equity)} />
        <SummaryCard
          label="Net P&L"
          value={formatINR(summary.pnl, { sign: true })}
          color={summary.pnl == null ? 'var(--text)' : summary.pnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      {/* lifecycle tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 14, flexWrap: 'wrap' }}>
        {visibleTabs.map((t) => {
          const count = t.key === 'all' ? accounts.length : t.key === 'pending' ? pendingOrders.length : buckets[t.key].length;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 14px', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer',
                color: on ? 'var(--text)' : 'var(--muted)', background: 'transparent', border: 'none',
                borderBottom: on ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1,
              }}
            >
              {t.label} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {tab === 'pending' ? (
        <PendingList orders={pendingOrders} loading={pendingLoading} />
      ) : (
        <>
          {/* status filter */}
          {statusesPresent.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {statusesPresent.map((s) => {
                const on = statusFilter === s;
                const label = s === 'all' ? 'All statuses' : getStatusMeta(s).label;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="btn btn-sm"
                    style={on
                      ? { background: 'var(--grad)', color: '#fff', border: '1px solid transparent' }
                      : { border: '1px solid var(--line2)', color: 'var(--muted)' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>No accounts match this filter.</p>
            </div>
          ) : (
            <>
              <AccountsTable rows={rows} onOpen={(id) => { selectAccount(id); router.push(`/portal/accounts/${id}`); }} />
              <div className="accounts-cards" style={{ gap: 14, gridTemplateColumns: '1fr' }}>
                {rows.map((a) => (
                  <AccountCard key={a.id} account={a} onOpen={() => { selectAccount(a.id); router.push(`/portal/accounts/${a.id}`); }} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: '13px 15px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9.5px', letterSpacing: '.1em' }}>{label}</span>
      <span style={{
        fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.7vw,20px)',
        lineHeight: 1.1, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
      }}>{value}</span>
      {sub && <span className="muted" style={{ fontSize: 11 }}>{sub}</span>}
    </div>
  );
}

function AccountsTable({ rows, onOpen }) {
  return (
    <div className="accounts-table-wrap">
      <table className="accounts-table">
        <thead>
          <tr>
            <th>Account</th><th>Type</th><th>Plan</th><th>Phase</th>
            <th>Capital</th><th>Equity</th><th>P&L</th><th>Return</th>
            <th>Status</th><th>Created</th><th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const plan = a.plans || null;
            const planType = plan?.plan_type ?? null;
            const { capital, equity, pnl, pnlPct } = accountFinancials(a, plan);
            const st = getStatusMeta(a.status);
            return (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(a.id)}>
                <td style={{ fontWeight: 700, fontFamily: 'Manrope,sans-serif' }}>{a.login_id || '—'}</td>
                <td>{getPlanTypeLabel(planType)}</td>
                <td className="muted">{plan?.name || '—'}</td>
                <td><span className="tag tag-blue" style={{ fontSize: 10 }}>{getPhaseDisplayLabel(planType, a.phase)}</span></td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(capital)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(equity)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: pnl == null ? 'var(--text)' : pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {formatINR(pnl, { sign: true })}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: pnlPct == null ? 'var(--text)' : pnlPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {pnlPct == null ? '—' : formatPct(pnlPct)}
                </td>
                <td><span className={`tag ${st.tag}`} style={{ fontSize: 10 }}>{st.label}</span></td>
                <td className="muted">{fmtDate(a.created_at)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Link href={`/portal/accounts/${a.id}`} className="btn btn-sm" style={{ border: '1px solid var(--line2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    Details <ArrowUpRight size={13} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AccountCard({ account: a, onOpen }) {
  const plan = a.plans || null;
  const planType = plan?.plan_type ?? null;
  const { capital, equity, pnl, pnlPct } = accountFinancials(a, plan);
  const st = getStatusMeta(a.status);
  const tp = targetProgress(a, plan);
  const funded = isFunded(a);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '13px 15px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Manrope,sans-serif' }}>{a.login_id || '—'}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {getPlanTypeLabel(planType)} · {plan?.name || '—'}
          </div>
        </div>
        <span className={`tag ${st.tag}`} style={{ fontSize: 10, flexShrink: 0 }}>{st.label}</span>
      </div>

      <div style={{ padding: '13px 15px', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px 14px' }}>
        <Field label="Phase" value={getPhaseDisplayLabel(planType, a.phase)} />
        <Field label="Created" value={fmtDate(a.created_at)} />
        <Field label="Capital" value={formatINR(capital)} />
        <Field label="Equity" value={formatINR(equity)} />
        <Field label="P&L" value={formatINR(pnl, { sign: true })} color={pnl == null ? undefined : pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <Field label="Return" value={pnlPct == null ? '—' : formatPct(pnlPct)} color={pnlPct == null ? undefined : pnlPct >= 0 ? 'var(--green)' : 'var(--red)'} />
      </div>

      {tp && (
        <div style={{ padding: '0 15px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginBottom: 5 }}>
            <span>Profit target</span><span>{tp.pct.toFixed(0)}% of {tp.target}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${tp.pct}%`, background: 'var(--grad)', borderRadius: 99 }} />
          </div>
        </div>
      )}

      <div style={{ padding: '12px 15px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onOpen} className="btn btn-grad btn-sm" style={{ flex: 1, minWidth: 120 }}>View Details</button>
        {(a.status === 'active' || funded) && (
          <Link href="/portal/terminal" className="btn btn-line btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <LineChart size={13} /> Terminal
          </Link>
        )}
        {funded && (
          <Link href="/portal/payouts" className="btn btn-line btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Wallet size={13} /> Payout
          </Link>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: '9px', letterSpacing: '.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
}

function PendingList({ orders, loading }) {
  if (loading) return <p className="muted" style={{ fontSize: 13 }}>Loading pending orders…</p>;
  if (!orders.length) return <div className="card" style={{ textAlign: 'center', padding: 36 }}><p className="muted" style={{ margin: 0 }}>No pending orders.</p></div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
      {orders.map((o) => (
        <div className="card" key={o.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontFamily: 'Manrope,sans-serif', fontSize: 15 }}>{o.plans?.name || 'Challenge order'}</b>
            <span className="tag tag-gold" style={{ fontSize: 10 }}>AWAITING ACTIVATION</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
            <span className="muted">Capital</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(o.plans?.capital)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
            <span className="muted">Fee</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(o.plans?.fee)}</b>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', marginBottom: 12 }}>
            <span className="muted">Placed</span><span>{fmtDate(o.created_at)}</span>
          </div>
          <p className="muted" style={{ fontSize: 11.5, margin: '0 0 10px', lineHeight: 1.5 }}>
            Your payment is being verified. The trading account appears here once it is approved.
          </p>
          <Link href="/portal/support" className="btn btn-line btn-sm" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ScrollText size={13} /> Contact Support
          </Link>
        </div>
      ))}
    </div>
  );
}
