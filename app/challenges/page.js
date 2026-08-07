'use client';
import { useEffect, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';

// Same static tiers as the landing page picker — kept identical on purpose
// so the two pages can never show different numbers again.
const SIZES = [
  { cap: '₹2 Lakh',  capN: 200000,  fee2: 2999,  fee1: 3899  },
  { cap: '₹5 Lakh',  capN: 500000,  fee2: 4999,  fee1: 6499  },
  { cap: '₹10 Lakh', capN: 1000000, fee2: 8999,  fee1: 11999 },
];
const inr = (n) => '₹' + n.toLocaleString('en-IN');

export default function Challenges() {
  const [step, setStep] = useState('2step');
  const [size, setSize] = useState(1);
  const [dbPlans, setDbPlans] = useState([]); // used only to resolve a real plan_id for the order
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [user, setUser] = useState(null);
  const [utr, setUtr] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponErr, setCouponErr] = useState('');

  async function applyCoupon() {
    const trimmed = coupon.trim().toUpperCase();
    if (!trimmed) return;
    setCouponErr('');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', trimmed)
      .eq('active', true)
      .maybeSingle();
    if (error || !data) return setCouponErr('Invalid or inactive code.');
    if (data.expires_at && new Date(data.expires_at) < new Date()) return setCouponErr('This code has expired.');
    setAppliedCoupon(data);
  }

  useEffect(() => {
    supabase.from('plans').select('*').eq('active', true).then(({ data, error }) => {
      if (error) setLoadErr(error.message);
      setDbPlans(data || []);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
  }, []);

  const s = SIZES[size];
  const fee = step === '2step' ? s.fee2 : s.fee1;
  const discount = appliedCoupon ? Math.round(fee * appliedCoupon.discount_percent / 100) : 0;
  const discountedFee = fee - discount;
  const t1 = step === '2step' ? 8 : 10;

  // find the real database row matching this capital (needed for the order's foreign key)
  const dbMatch = dbPlans.find((p) => p.capital === s.capN);

  async function submitOrder() {
    setErr(''); setMsg('');
    if (!user) { window.location.href = '/login'; return; }
    if (!utr.trim()) return setErr('Please enter the UTR / transaction reference number after paying.');
    if (!dbMatch) return setErr('This account size is not set up in the database yet — ask the team to run the plans migration.');
    setBusy(true);
    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      plan_id: dbMatch.id,
      utr: utr.trim(),
      eval_type: step,
      fee_amount: discountedFee,
      coupon_code: appliedCoupon?.code || null,
      discount_percent: appliedCoupon?.discount_percent || null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setUtr('');
    setMsg('Order submitted! Your challenge account will be activated after payment verification (usually under 1 hour). Track status on your Dashboard.');
  }

  if (loading) return <div className="wrap" style={{ padding: '80px 0' }}><p className="muted">Loading…</p></div>;

  return (
    <main>
      <section>
        <div className="wrap">
          <div className="sec-head">
            <span className="pill">Challenges</span>
            <h2>Pick your path and your size</h2>
            <p>One-time fee. Unlimited time. Free retry if you end in profit without breaches.</p>
          </div>

          {/* tabs — identical to the landing page picker */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['1step', '1 Step'], ['2step', '2 Step']].map(([k, label]) => (
              <button key={k} onClick={() => setStep(k)} className="btn btn-sm"
                style={step === k
                  ? { background: 'var(--grad)', color: '#fff', fontWeight: 800 }
                  : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>{label}</button>
            ))}
            <span style={{ width: 18 }} />
            {SIZES.map((x, i) => (
              <button key={x.cap} onClick={() => setSize(i)} className="btn btn-sm"
                style={size === i
                  ? { background: 'rgba(34,197,139,.16)', color: 'var(--green)', border: '1px solid rgba(34,197,139,.45)', fontWeight: 800 }
                  : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                {x.cap}{i === 1 ? ' ★' : ''}
              </button>
            ))}
          </div>

          {loadErr && <div className="err">Plans database note: {loadErr}</div>}
          {!loadErr && !dbMatch && (
            <div className="err" style={{ maxWidth: 620, margin: '0 auto 20px' }}>
              This account size isn&apos;t active in the database yet — run <b>plans-3tier-fix.sql</b> in Supabase,
              then refresh.
            </div>
          )}

          <div className="grid2" style={{ alignItems: 'start' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{step === '2step' ? '2 Step Evaluation' : '1 Step Evaluation'} · {s.cap} account</div>
                  <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 27 }}>
                    {inr(fee)} <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>evaluation fee</span>
                  </div>
                </div>
                <span className="tag tag-green">Fee refunded with first payout</span>
              </div>
              <table className="tbl num">
                <tbody>
                  <tr><td style={{ paddingLeft: 26 }}>Profit target {step === '2step' ? '(Phase 1)' : ''}</td>
                    <td style={{ textAlign: 'right', paddingRight: 26 }}>{t1}% · <span className="muted">{inr(s.capN * t1 / 100)}</span></td></tr>
                  {step === '2step' && (
                    <tr><td style={{ paddingLeft: 26 }}>Profit target (Phase 2)</td>
                      <td style={{ textAlign: 'right', paddingRight: 26 }}>5% · <span className="muted">{inr(s.capN * 5 / 100)}</span></td></tr>
                  )}
                  <tr><td style={{ paddingLeft: 26 }}>Maximum loss</td>
                    <td style={{ textAlign: 'right', paddingRight: 26 }}>10% · <span className="muted">{inr(s.capN * 10 / 100)}</span></td></tr>
                  <tr><td style={{ paddingLeft: 26 }}>Maximum daily loss</td>
                    <td style={{ textAlign: 'right', paddingRight: 26 }}>5% · <span className="muted">{inr(s.capN * 5 / 100)}</span></td></tr>
                  <tr><td style={{ paddingLeft: 26 }}>Profit split</td>
                    <td style={{ textAlign: 'right', paddingRight: 26, color: 'var(--green)', fontWeight: 700 }}>Up to 90%</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Coupon code (optional)</label>
                  <input value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponErr(''); }}
                    placeholder="e.g. WELCOME10" style={{ textTransform: 'uppercase' }} />
                </div>
                <button className="btn btn-line btn-sm" style={{ height: 36 }} onClick={applyCoupon} disabled={!coupon.trim() || busy}>
                  Apply
                </button>
              </div>
              {couponErr && <div className="err" style={{ marginTop: 8, fontSize: 12.5 }}>{couponErr}</div>}
              {appliedCoupon && (
                <div className="ok" style={{ marginTop: 8, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ {appliedCoupon.discount_percent}% off applied</span>
                  <button onClick={() => { setAppliedCoupon(null); setCoupon(''); }} className="btn btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}>Remove</button>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>Payment</h3>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 18 }}>
                Scan the QR, pay <b className="num" style={{ color: 'var(--text)' }}>{inr(discountedFee)}</b>, then enter your
                UTR / reference number below. Your account activates after verification.
                {appliedCoupon && <span className="muted" style={{ display: 'block', marginTop: 4 }}>Fee: <span style={{ textDecoration: 'line-through', opacity: .6 }}>{inr(fee)}</span> → <span className="num" style={{ color: 'var(--green)' }}>-{inr(discount)}</span> with {appliedCoupon.code}</span>}
              </p>
              <div style={{
                width: 180, height: 180, borderRadius: 14, margin: '0 auto 18px',
                border: '1px dashed rgba(34,197,139,.5)', display: 'grid', placeItems: 'center',
                background: 'var(--bg2)', textAlign: 'center', fontSize: 11.5, color: 'var(--green)', padding: 10,
              }}>
                QR PLACEHOLDER<br />(payments disabled<br />in prototype)
              </div>
              {err && <div className="err">{err}</div>}
              {msg && <div className="ok">{msg}</div>}
              <div className="field">
                <label>UTR / Transaction reference</label>
                <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 4187XXXXXXXX" />
              </div>
              <button className="btn btn-grad" style={{ width: '100%' }} onClick={submitOrder} disabled={busy}>
                {busy ? 'Submitting…' : user ? 'Submit for Verification' : 'Log in to Continue'}
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 14 }}>
                Prototype note: no real payment is collected. This flow demonstrates the manual UPI verification
                system. Gateway integration is pending legal &amp; compliance structuring.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
