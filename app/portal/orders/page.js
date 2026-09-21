'use client';

/* ============================================================
   /portal/orders  —  Trader order & payment history  (Batch 19)

   Read-only. Every row is a real `public.orders` row for the signed-in
   user (RLS: "orders own read" -> auth.uid() = user_id). No field is
   fabricated: amount, coupon, evaluation type and status all come from
   the row (fee_amount / eval_type are server-derived by the pricing
   trigger; if that trigger isn't deployed yet they're null and we fall
   back to the plan's list fee).

   There is no invoice / GST / receipt system in the product, so this
   page does not render a "Download Invoice" control — it points to
   Support for a payment confirmation instead.
   ============================================================ */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { formatINR } from '@/lib/format';
import { getPlanTypeLabel } from '@/lib/accounts';

const EVAL_LABEL = { '1step': 'One-Step', '2step': 'Two-Step', instant: 'Instant' };

const STATUS_META = {
  pending: {
    tag: 'tag-gold',
    label: 'Pending verification',
    note: 'Your payment reference is being checked. No trading account is created until it is verified.',
  },
  approved: {
    tag: 'tag-green',
    label: 'Verified',
    note: 'Payment verified. The trading account is under Accounts.',
  },
  rejected: {
    tag: 'tag-red',
    label: 'Not approved',
    note: 'This order was not approved. Contact Support if you have questions.',
  },
};

function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime())
    ? '—'
    : t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusMeta(s) {
  return STATUS_META[s] || { tag: 'tag-blue', label: s ? String(s) : 'Unknown', note: '' };
}

export default function OrdersPage() {
  const { ready, userId } = usePortalData();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let on = true;
    (async () => {
      setLoading(true);
      setError('');
      const { data, error: e } = await supabase
        .from('orders')
        .select('id, status, utr, coupon_code, discount_percent, eval_type, fee_amount, created_at, plans(name, capital, plan_type, fee)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!on) return;
      if (e) setError(e.message);
      setOrders(data || []);
      setLoading(false);
    })();
    return () => { on = false; };
  }, [userId]);

  if (!ready || loading) {
    return (
      <div className="portal-dashboard">
        <p className="muted" style={{ fontSize: 13 }}>Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="portal-dashboard" style={{ maxWidth: 940 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Orders</h1>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Every challenge purchase on your profile and where it stands.</p>
        </div>
        <Link href="/challenges" className="btn btn-grad btn-sm">New Challenge</Link>
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>Could not load orders: {error}</div>}

      {orders.length === 0 && !error ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
          <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>No orders yet</h2>
          <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px' }}>
            When you start a challenge, the purchase and its verification status show up here.
          </p>
          <Link href="/challenges" className="btn btn-grad btn-sm">Browse Challenges</Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="orders-table-wrap">
              <table className="tbl num orders-table" style={{ minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>Placed</th>
                    <th>Plan</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Payment ref (UTR)</th>
                    <th style={{ paddingRight: 20 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const sm = statusMeta(o.status);
                    const evalLabel = EVAL_LABEL[o.eval_type] || getPlanTypeLabel(o.plans?.plan_type);
                    const amount = o.fee_amount ?? o.plans?.fee ?? null;
                    return (
                      <tr key={o.id}>
                        <td style={{ paddingLeft: 20 }} className="muted">{fmtDate(o.created_at)}</td>
                        <td>
                          {o.plans?.name || '—'}
                          {o.plans?.capital != null && (
                            <div className="muted" style={{ fontSize: 10.5 }}>{formatINR(o.plans.capital)} account</div>
                          )}
                        </td>
                        <td><span className="tag tag-blue" style={{ fontSize: 10 }}>{evalLabel}</span></td>
                        <td>
                          {formatINR(amount)}
                          {o.coupon_code && (
                            <div className="muted" style={{ fontSize: 10.5 }}>
                              {o.coupon_code}{o.discount_percent ? ` · ${o.discount_percent}% off` : ''}
                            </div>
                          )}
                        </td>
                        <td className="muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.utr || '—'}</td>
                        <td style={{ paddingRight: 20 }}>
                          <span className={'tag ' + sm.tag} style={{ fontSize: 10 }}>{sm.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* mobile cards — same desktop-table / mobile-card swap used by
                Accounts / Payouts / Leaderboard */}
            <div className="orders-cards">
              {orders.map((o) => {
                const sm = statusMeta(o.status);
                const evalLabel = EVAL_LABEL[o.eval_type] || getPlanTypeLabel(o.plans?.plan_type);
                const amount = o.fee_amount ?? o.plans?.fee ?? null;
                return (
                  <div key={o.id} style={{ padding: '13px 16px', borderBottom: '1px solid rgba(34,197,139,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontFamily: 'Manrope,sans-serif', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.plans?.name || '—'}
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{fmtDate(o.created_at)}</div>
                      </div>
                      <span className={'tag ' + sm.tag} style={{ fontSize: 10, flexShrink: 0 }}>{sm.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 10 }}>
                      <span className="tag tag-blue" style={{ fontSize: 10 }}>{evalLabel}</span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(amount)}</b>
                    </div>
                    {o.coupon_code && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                        {o.coupon_code}{o.discount_percent ? ` · ${o.discount_percent}% off` : ''}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      UTR: {o.utr || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* status legend — plain words, not colour-only */}
          <div className="card" style={{ marginTop: 14, padding: '14px 16px' }}>
            <h2 style={{ fontSize: 13, margin: '0 0 8px' }}>What the statuses mean</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['pending', 'approved', 'rejected'].map((s) => (
                <li key={s} style={{ fontSize: 12, lineHeight: 1.55 }}>
                  <b>{statusMeta(s).label}</b> — <span className="muted">{statusMeta(s).note}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="muted" style={{ fontSize: 11.5, marginTop: 14, lineHeight: 1.6 }}>
            Payment is by manual UPI transfer — a UTR is the reference you submitted, not a confirmation of receipt.
            A member of the team verifies each transfer before the account is created. Formal tax invoices are not
            issued yet; for a payment confirmation, raise a request in{' '}
            <Link href="/portal/support" style={{ color: 'var(--green)' }}>Support</Link>.
          </p>
        </>
      )}
    </div>
  );
}
