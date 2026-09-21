'use client';

/* ============================================================
   /portal/payouts  —  Payout operations workspace  (canonical)

   Data model: the existing `public.payouts` table only
     (id, account_id, user_id, amount bigint, status default 'requested', created_at)
   Statuses: 'requested' | 'paid' | 'rejected'  (set by the admin panel).

   Accounts come from PortalDataProvider (no second fetch). Eligibility is
   derived from real account fields + the canonical resolver (lib/rules.js
   via lib/payouts.js) — nothing about split / minimum / cycle is invented.

   BACKEND GAPS surfaced honestly in the UI:
   - no payment-method storage
   - no processed-at / reference / rejection-reason / certificate columns
   - no server-side amount / ownership validation (admin approval is the gate)
   ============================================================ */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { getPhaseDisplayLabel } from '@/lib/rules';
import { formatINR } from '@/lib/format';
import { getPlanTypeLabel, isFunded } from '@/lib/accounts';
import { payoutStatusMeta, computeEligibility, validatePayoutAmount } from '@/lib/payouts';
import DashboardEmptyState from '@/components/portal/dashboard/DashboardEmptyState';

function fmtDateTime(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PayoutsPage() {
  const { ready, error: ctxError, accounts, userId, selectedAccount } = usePortalData();

  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');

  const fundedAccounts = useMemo(() => accounts.filter((a) => isFunded(a)), [accounts]);
  const eligibility = useMemo(() => {
    const map = new Map();
    for (const a of fundedAccounts) map.set(a.id, computeEligibility(a, a.plans));
    return map;
  }, [fundedAccounts]);
  const eligibleAccounts = fundedAccounts.filter((a) => eligibility.get(a.id)?.state === 'eligible');

  async function loadPayouts() {
    if (!userId) return;
    setPayoutsLoading(true);
    setPayoutsError('');
    setPayouts([]);
    const { data, error } = await supabase
      .from('payouts')
      .select('*, accounts(login_id, phase, plans(name, plan_type))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) setPayoutsError(error.message);
    setPayouts(data || []);
    setPayoutsLoading(false);
  }

  useEffect(() => { loadPayouts(); /* eslint-disable-next-line */ }, [userId]);

  // ---- summary (real sums only) ----
  const summary = useMemo(() => {
    let available = 0, availableHas = false;
    for (const a of fundedAccounts) {
      const e = eligibility.get(a.id);
      if (e?.profit != null) { available += Math.max(0, e.profit); availableHas = true; }
    }
    const sum = (st) => payouts.filter((p) => p.status === st).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return {
      available: availableHas ? available : null,
      pending: sum('requested'),
      paid: sum('paid'),
      count: payouts.length,
    };
  }, [fundedAccounts, eligibility, payouts]);

  const filteredHistory = historyFilter === 'all'
    ? payouts
    : payouts.filter((p) => p.account_id === historyFilter);

  const accountsWithPayouts = useMemo(() => {
    const ids = new Set(payouts.map((p) => p.account_id));
    return accounts.filter((a) => ids.has(a.id));
  }, [payouts, accounts]);

  if (!ready) return <div className="portal-dashboard"><DashboardEmptyState type="loading" /></div>;
  if (ctxError) return <div className="portal-dashboard"><DashboardEmptyState type="error" /></div>;

  return (
    <div className="portal-dashboard">
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Payouts</h1>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: 560 }}>
            Request a payout from a funded account in profit. Requests are reviewed and paid manually by the
            FundedDesk team — there is no automated payout gateway yet.
          </p>
        </div>
        <button
          className="btn btn-grad btn-sm"
          disabled={eligibleAccounts.length === 0}
          onClick={() => setModalOpen(true)}
          style={eligibleAccounts.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          title={eligibleAccounts.length === 0 ? 'No eligible funded account' : undefined}
        >
          Request Payout
        </button>
      </div>
      {eligibleAccounts.length === 0 && fundedAccounts.length > 0 && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          None of your funded accounts currently meet the requirements to request a payout.
        </p>
      )}

      {/* summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '18px 0' }}>
        <KpiCard label="Available for Payout" value={formatINR(summary.available)} hint="Profit across funded accounts" color="var(--green)" />
        <KpiCard label="Pending" value={formatINR(summary.pending)} hint="Requested, awaiting review" />
        <KpiCard label="Paid" value={formatINR(summary.paid)} hint="Lifetime, marked paid" />
        <KpiCard label="Requests" value={payoutsLoading ? '—' : String(summary.count)} hint="Total payout requests" />
      </div>

      {/* eligibility */}
      <SectionCard title="Account eligibility">
        {fundedAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '26px 16px' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🏦</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No funded accounts available</div>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 auto 14px', maxWidth: 320 }}>
              Payouts are only available on funded accounts. Pass an evaluation to unlock payouts.
            </p>
            <Link href="/portal/accounts" className="btn btn-grad btn-sm">View Accounts</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fundedAccounts.map((a) => {
              const e = eligibility.get(a.id);
              const planType = a.plans?.plan_type ?? null;
              const badge = e.state === 'eligible'
                ? { text: 'Eligible', tag: 'tag-green' }
                : e.state === 'ineligible'
                  ? { text: 'Not Eligible', tag: 'tag-gold' }
                  : { text: 'Unknown', tag: 'tag-muted' };
              return (
                <div key={a.id} className="card" style={{ padding: '13px 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Manrope,sans-serif' }}>{a.login_id || '—'}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {getPlanTypeLabel(planType)} · {a.plans?.name || '—'} · {getPhaseDisplayLabel(planType, a.phase)}
                      </div>
                    </div>
                    <span className={`tag ${badge.tag}`} style={{ fontSize: 10 }}>{badge.text}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '8px 14px', marginTop: 10 }}>
                    <MiniField label="Capital" value={formatINR(e.capital)} />
                    <MiniField label="Equity" value={formatINR(e.equity)} />
                    <MiniField label="P&L" value={formatINR(e.profit, { sign: true })} color={e.profit == null ? undefined : e.profit >= 0 ? 'var(--green)' : 'var(--red)'} />
                    <MiniField label="Profit split" value={e.splitPct == null ? 'Not specified' : `${e.splitPct}%`} />
                    <MiniField label="Split of profit" value={e.splitAmount == null ? '—' : formatINR(e.splitAmount)} />
                  </div>
                  <p className="muted" style={{ fontSize: 11.5, margin: '10px 0 0' }}>{e.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* history */}
      <SectionCard
        title="Payout history"
        right={accountsWithPayouts.length > 1 && (
          <select
            value={historyFilter}
            onChange={(ev) => setHistoryFilter(ev.target.value)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5, background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, color: 'var(--text)' }}
          >
            <option value="all">All accounts</option>
            {accountsWithPayouts.map((a) => <option key={a.id} value={a.id}>{a.login_id}</option>)}
          </select>
        )}
      >
        {payoutsError ? (
          <div className="err" style={{ margin: 0, fontSize: 12.5 }}>Could not load payouts: {payoutsError}</div>
        ) : payoutsLoading ? (
          <PayoutSkeleton />
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 16px' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {payouts.length === 0 ? 'No payout requests yet.' : 'No payouts for this account.'}
            </p>
          </div>
        ) : (
          <>
            <div className="payouts-table-wrap">
              <table className="payouts-table">
                <thead>
                  <tr><th>#</th><th>Account</th><th>Type</th><th>Amount</th><th>Status</th><th>Requested</th></tr>
                </thead>
                <tbody>
                  {filteredHistory.map((p, i) => {
                    const meta = payoutStatusMeta(p.status);
                    return (
                      <tr key={p.id} onClick={() => setDetail(p)}>
                        <td className="muted">{i + 1}</td>
                        <td style={{ fontWeight: 600, fontFamily: 'Manrope,sans-serif' }}>{p.accounts?.login_id || '—'}</td>
                        <td className="muted">{getPlanTypeLabel(p.accounts?.plans?.plan_type)}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatINR(p.amount)}</td>
                        <td><span className={`tag ${meta.tag}`} style={{ fontSize: 10 }}>{meta.label}</span></td>
                        <td className="muted">{fmtDate(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="payouts-cards" style={{ gap: 10, gridTemplateColumns: '1fr' }}>
              {filteredHistory.map((p, i) => {
                const meta = payoutStatusMeta(p.status);
                return (
                  <div key={p.id} className="card" style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => setDetail(p)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontWeight: 700, fontFamily: 'Manrope,sans-serif', fontSize: 14 }}>
                        <span className="muted" style={{ fontWeight: 500 }}>#{i + 1} · </span>{p.accounts?.login_id || '—'}
                      </div>
                      <span className={`tag ${meta.tag}`} style={{ fontSize: 10 }}>{meta.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5 }}>
                      <span className="muted">{getPlanTypeLabel(p.accounts?.plans?.plan_type)}</span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(p.amount)}</b>
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Requested {fmtDate(p.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {modalOpen && (
        <RequestPayoutModal
          eligibleAccounts={eligibleAccounts}
          eligibility={eligibility}
          defaultAccountId={
            selectedAccount && eligibility.get(selectedAccount.id)?.state === 'eligible'
              ? selectedAccount.id
              : eligibleAccounts[0]?.id
          }
          userId={userId}
          onClose={() => setModalOpen(false)}
          onSubmitted={() => { loadPayouts(); }}
        />
      )}

      {detail && <PayoutDetailModal payout={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ---------------- request modal ---------------- */

function RequestPayoutModal({ eligibleAccounts, eligibility, defaultAccountId, userId, onClose, onSubmitted }) {
  const [accountId, setAccountId] = useState(defaultAccountId || eligibleAccounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const account = eligibleAccounts.find((a) => a.id === accountId) || null;
  const elig = account ? eligibility.get(account.id) : null;

  // clear dependent state whenever the target account changes
  useEffect(() => { setAmount(''); setAmountError(''); setSubmitError(''); }, [accountId]);

  function onAmountChange(v) {
    setAmount(v);
    if (v === '') { setAmountError(''); return; }
    setAmountError(elig ? (validatePayoutAmount(Number(v), elig) || '') : 'Select an account first.');
  }

  async function submit() {
    setSubmitError('');
    if (!account || !elig) { setSubmitError('Select an account.'); return; }
    if (!userId) { setSubmitError('Session expired — please sign in again.'); return; }
    const err = validatePayoutAmount(Number(amount), elig);
    if (err) { setAmountError(err); return; }
    setSubmitting(true);
    const { error } = await supabase.from('payouts').insert({
      account_id: account.id,
      user_id: userId,
      amount: Number(amount),
      status: 'requested',
    });
    setSubmitting(false);
    if (error) { setSubmitError(error.message); return; }
    setSubmitted(true);
    onSubmitted?.();
  }

  return (
    <Modal onClose={onClose} title={submitted ? 'Payout request submitted' : 'Request payout'}>
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,139,.13)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontSize: 22 }}>✓</div>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 6px' }}>
            Your request for <b style={{ color: 'var(--text)' }}>{formatINR(Number(amount))}</b> on{' '}
            <b style={{ color: 'var(--text)' }}>{account?.login_id}</b> has been recorded with status{' '}
            <b style={{ color: 'var(--text)' }}>Requested</b>.
          </p>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 18px' }}>
            It is awaiting verification and processing by the team. You’ll see it update in Payout history.
          </p>
          <button className="btn btn-grad btn-sm" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Funded account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 13.5, color: 'var(--text)' }}
            >
              {eligibleAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.login_id} · {a.plans?.name || '—'}</option>
              ))}
            </select>
          </div>

          {elig && (
            <div className="card" style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px 12px' }}>
              <MiniField label="Capital" value={formatINR(elig.capital)} />
              <MiniField label="Equity" value={formatINR(elig.equity)} />
              <MiniField label="Profit available" value={formatINR(elig.profit)} color="var(--green)" />
              <MiniField label="Profit split" value={elig.splitPct == null ? 'Not specified' : `${elig.splitPct}%`} />
              <MiniField label="Min payout" value={elig.minAmount == null ? 'Not specified' : formatINR(elig.minAmount)} />
              <MiniField label="Max this request" value={elig.maxAmount == null ? formatINR(elig.profit) : formatINR(elig.maxAmount)} />
            </div>
          )}

          <div className="field" style={{ margin: 0 }}>
            <label>Requested amount (₹)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="e.g. 25000"
                style={{ flex: 1 }}
              />
              {elig?.splitAmount != null && (
                <button type="button" className="btn btn-line btn-sm" onClick={() => onAmountChange(String(elig.splitAmount))}>
                  Use {formatINR(elig.splitAmount)}
                </button>
              )}
            </div>
            {amount !== '' && !amountError && (
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Requesting {formatINR(Number(amount))}</div>
            )}
            {amountError && <div className="err" style={{ margin: '8px 0 0', fontSize: 12 }}>{amountError}</div>}
          </div>

          <div style={{ padding: '11px 13px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Payment method</div>
            <p className="muted" style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
              Payment method configuration is pending. The team will confirm your payout destination directly after
              the request is verified — no bank/UPI details are collected here.
            </p>
          </div>

          {submitError && <div className="err" style={{ margin: 0, fontSize: 12.5 }}>{submitError}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-line btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-grad btn-sm"
              onClick={submit}
              disabled={submitting || !!amountError || amount === ''}
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- detail modal ---------------- */

function PayoutDetailModal({ payout, onClose }) {
  const meta = payoutStatusMeta(payout.status);
  return (
    <Modal onClose={onClose} title="Payout details">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DetailLine label="Payout ID" value={payout.id} mono />
        <DetailLine label="Account" value={payout.accounts?.login_id || '—'} />
        <DetailLine label="Account type" value={getPlanTypeLabel(payout.accounts?.plans?.plan_type)} />
        <DetailLine label="Requested amount" value={formatINR(payout.amount)} strong />
        <DetailLine label="Status" value={<span className={`tag ${meta.tag}`} style={{ fontSize: 10 }}>{meta.label}</span>} />
        <DetailLine label="Requested on" value={fmtDateTime(payout.created_at)} />
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        Processed date, payment reference and certificate are not tracked by the current payout system.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn btn-line btn-sm" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* ---------------- primitives ---------------- */

function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)', display: 'grid', placeItems: 'center', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, color }) {
  return (
    <div className="card" style={{ padding: '13px 15px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9.5px', letterSpacing: '.1em' }}>{label}</span>
      <span style={{ fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.7vw,20px)', lineHeight: 1.1, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</span>
      {hint && <span className="muted" style={{ fontSize: 10.5 }}>{hint}</span>}
    </div>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <div className="card" style={{ padding: 0, marginBottom: 16 }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {right || null}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function MiniField({ label, value, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: '8.5px', letterSpacing: '.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
}

function DetailLine({ label, value, mono, strong }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: mono ? 11 : 13, fontWeight: strong ? 800 : 600, fontFamily: mono ? 'ui-monospace, monospace' : undefined, textAlign: 'right', wordBreak: mono ? 'break-all' : undefined }}>{value}</span>
    </div>
  );
}

function PayoutSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
