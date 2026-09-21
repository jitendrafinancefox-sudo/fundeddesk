'use client';

/* ============================================================
   /cart  —  Checkout for one selected challenge plan

   - The plan is re-read from the `plans` table by id (query param, or
     the persisted selection). No prices/rules are trusted from the URL.
   - Coupons are validated against the real `coupons` table. A discount
     is shown ONLY after that row comes back valid + active + unexpired.
   - Affiliate credit is NOT an order-level feature in the schema, so the
     field is present but disabled with an honest explanation.
   - Checkout inserts a real `orders` row (status defaults to 'pending').
     There is NO payment gateway and NO account creation here — the order
     is verified manually and then appears in Accounts → Pending.
   ============================================================ */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatINR } from '@/lib/format';
import { getPlanTypeLabel } from '@/lib/accounts';
import { readSelection, writeSelection, clearSelection, evalTypeForPlan } from '@/lib/cart';
import { validateCoupon, COUPON_STATUS, COUPON_STATUS_MESSAGE } from '@/lib/coupons';
import { LEGAL_VERSION } from '@/lib/legal';

export default function CartPage() {
  return (
    <main>
      <section style={{ padding: '40px 0 72px' }}>
        <div className="wrap" style={{ maxWidth: 920 }}>
          <Suspense fallback={<p className="muted" style={{ textAlign: 'center' }}>Loading…</p>}>
            <CartInner />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

function CartInner() {
  const params = useSearchParams();
  const planIdParam = params.get('plan');

  const [planId, setPlanId] = useState(planIdParam || null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState(null);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount_percent }
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const [utr, setUtr] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placed, setPlaced] = useState(false);

  // Resolve the plan id from the URL, else the persisted selection.
  useEffect(() => {
    if (planIdParam) { setPlanId(planIdParam); return; }
    const sel = readSelection();
    if (sel?.planId) setPlanId(sel.planId);
    else setLoading(false);
  }, [planIdParam]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
  }, []);

  useEffect(() => {
    if (!planId) return;
    let on = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .eq('active', true)
        .maybeSingle();
      if (!on) return;
      if (error) setLoadError(error.message);
      setPlan(data || null);
      if (data) writeSelection({ planId: String(data.id), evalType: evalTypeForPlan(data.plan_type) });
      setLoading(false);
    })();
    return () => { on = false; };
  }, [planId]);

  const unitPrice = Number.isFinite(Number(plan?.fee)) ? Number(plan.fee) : null;
  const discount = useMemo(() => {
    if (!appliedCoupon || unitPrice == null) return 0;
    return Math.round((unitPrice * appliedCoupon.discount_percent) / 100);
  }, [appliedCoupon, unitPrice]);
  const total = unitPrice == null ? null : Math.max(0, unitPrice - discount);

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError('');
    // Server-side check via the validate_coupon RPC — the browser never reads
    // the coupons table. The discount shown below is a PREVIEW: the real fee is
    // recomputed on the server (orders_price_guard trigger) when the order is placed.
    const r = await validateCoupon(code, plan?.id ?? null);
    setCouponBusy(false);
    if (r.status !== COUPON_STATUS.VALID || r.discountPercent == null) {
      setCouponError(COUPON_STATUS_MESSAGE[r.status] || 'That code can’t be used.');
      return;
    }
    setAppliedCoupon({ code: r.code || code, discount_percent: r.discountPercent });
    setCouponInput(r.code || code);
  }

  async function placeOrder() {
    if (submitting) return; // re-entrancy guard: ignore a second click before the first resolves
    setSubmitError('');
    if (!user) { window.location.href = '/login'; return; }
    if (!plan) { setSubmitError('No plan selected.'); return; }
    if (!agree) { setSubmitError('Please confirm you have read the Risk Disclosure and agree to the Terms.'); return; }
    if (!utr.trim()) { setSubmitError('Enter your UPI transaction reference (UTR) after paying.'); return; }
    setSubmitting(true);
    // Send ONLY the fields the user legitimately owns: which plan, the payment
    // reference, and the coupon code they typed. eval_type / fee_amount /
    // discount_percent / status / user_id are all set server-side by triggers
    // (supabase/coupons-hardening.sql + admin-hardening.sql) — anything sent
    // here for those would be overwritten, so it isn't sent.
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      plan_id: plan.id,
      utr: utr.trim(),
      coupon_code: appliedCoupon?.code || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505' || /duplicate key|unique/i.test(error.message || '')) {
        setSubmitError('You have already submitted this payment reference for this plan. Check Orders for its status.');
        return;
      }
      setSubmitError(error.message);
      return;
    }
    // Record the agreement against the version the user saw. Best-effort;
    // never blocks the order (the checkbox gate above is the hard stop).
    try { await supabase.rpc('record_legal_acceptance', { p_document: 'bundle', p_version: LEGAL_VERSION, p_context: 'checkout' }); } catch (e) {}
    clearSelection();
    setPlaced(true);
  }

  // ---- states ----
  if (loading) return <p className="muted" style={{ textAlign: 'center' }}>Loading your cart…</p>;

  if (placed) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '44px 28px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(34,197,139,.13)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
        <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Order received</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 6 }}>
          Your payment reference has been submitted for manual verification.
        </p>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
          The challenge account will appear under <b>Accounts → Pending</b> and activate once verification is complete
          (usually within an hour). No account is created until then.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/portal/orders" className="btn btn-grad">View Order Status</Link>
          <Link href="/challenges" className="btn btn-line">Browse Challenges</Link>
        </div>
      </div>
    );
  }

  if (!planId || (!plan && !loadError)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '44px 28px', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🛒</div>
        <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Your cart is empty</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
          {loadError ? `We couldn't load that plan: ${loadError}` : 'Pick a challenge plan to get started.'}
        </p>
        <Link href="/challenges" className="btn btn-grad">Browse Challenges</Link>
      </div>
    );
  }

  if (loadError && !plan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '44px 28px', maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Plan unavailable</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>{loadError}</p>
        <Link href="/challenges" className="btn btn-grad">Browse Challenges</Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <Link href="/challenges" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to challenges</Link>
        <h1 style={{ fontSize: 24, margin: '8px 0 0', fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>Checkout</h1>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        {/* left: item + coupon + affiliate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 14 }}>Selected plan</div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18 }}>{plan.name || '—'}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span className="tag tag-blue" style={{ fontSize: 10 }}>{getPlanTypeLabel(plan.plan_type)}</span>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {plan.capital != null ? `${formatINR(plan.capital)} account` : 'Account size not specified'}
                    </span>
                  </div>
                </div>
                <div className="num" style={{ fontWeight: 800, fontSize: 17, whiteSpace: 'nowrap' }}>{formatINR(plan.fee)}</div>
              </div>
              <p className="dim" style={{ fontSize: 12, margin: 0 }}>
                One-time evaluation fee. See rules on the{' '}
                <Link href="/challenges" style={{ color: 'var(--green)' }}>plan card</Link> or the{' '}
                <Link href="/rules" style={{ color: 'var(--green)' }}>rulebook</Link>.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: appliedCoupon || couponError ? 10 : 0 }}>
              <label>Coupon code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Enter code"
                  style={{ flex: 1, textTransform: 'uppercase' }}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button className="btn btn-line btn-sm" onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}>Remove</button>
                ) : (
                  <button className="btn btn-line btn-sm" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()}>
                    {couponBusy ? 'Checking…' : 'Apply'}
                  </button>
                )}
              </div>
            </div>
            {couponError && <div className="err" style={{ margin: 0, fontSize: 12.5 }}>{couponError}</div>}
            {appliedCoupon && (
              <div className="ok" style={{ margin: 0, fontSize: 12.5 }}>
                ✓ {appliedCoupon.code} — {appliedCoupon.discount_percent}% off applied
              </div>
            )}
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Affiliate code</label>
              <input placeholder="Not applied at checkout" disabled />
            </div>
            <p className="dim" style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
              Affiliate rewards are attributed from a referral link at sign-up, not entered at checkout. This field is
              reserved for future order-level affiliate support.
            </p>
          </div>
        </div>

        {/* right: summary + checkout */}
        <div className="card" style={{ padding: 0, position: 'sticky', top: 20 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 14 }}>Order summary</div>
          <div style={{ padding: '18px 20px' }}>
            <Row label="Subtotal" value={formatINR(unitPrice)} />
            {appliedCoupon && discount > 0 && (
              <Row label={`Discount (${appliedCoupon.code})`} value={`− ${formatINR(discount)}`} color="var(--green)" />
            )}
            <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
            <Row label="Total" value={formatINR(total)} bold />
            <p className="dim" style={{ fontSize: 10.5, margin: '6px 0 0', lineHeight: 1.4 }}>
              Shown as a preview. The payable fee is recalculated by the server from the plan price and the coupon
              when the order is placed.
            </p>

            <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Payment</div>
              <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.55 }}>
                Online payment gateway integration is pending. To purchase now, transfer{' '}
                <b style={{ color: 'var(--text)' }}>{formatINR(total)}</b> by UPI and submit your transaction reference
                (UTR) below for manual verification.
              </p>
            </div>

            {submitError && <div className="err" style={{ marginTop: 14, marginBottom: 0, fontSize: 12.5 }}>{submitError}</div>}

            <div className="field" style={{ marginTop: 14, marginBottom: 12 }}>
              <label>UPI transaction reference (UTR)</label>
              <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 4187XXXXXXXX" />
            </div>

            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 'auto', marginTop: 2 }} />
              <span>
                I have read the <a href="/risk-disclosure" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>Risk Disclosure</a> and{' '}
                <a href="/refund" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>Refund Policy</a>, and I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>Terms of Service</a> and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>Privacy Policy</a> (draft).
              </span>
            </label>

            <button className="btn btn-grad" style={{ width: '100%' }} onClick={placeOrder} disabled={submitting || (!!user && !agree)}>
              {submitting ? 'Placing order…' : user ? 'Place Order for Verification' : 'Log in to Checkout'}
            </button>

            <p className="dim" style={{ fontSize: 11, marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
              No card is charged here. Placing the order records a pending request; your account is created only after
              the team verifies the payment.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', fontSize: bold ? 15 : 13 }}>
      <span className="muted" style={{ fontWeight: bold ? 700 : 500, color: bold ? 'var(--text)' : undefined }}>{label}</span>
      <span className="num" style={{ fontWeight: bold ? 800 : 600, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}
