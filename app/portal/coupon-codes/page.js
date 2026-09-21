'use client';

/* ============================================================
   /portal/coupon-codes  —  Coupon code checker

   Real model: coupons are team-created promo codes with only
   { code, discount_percent, active, expires_at }. There is NO per-user
   coupon inventory, no usage limit, no plan restriction, no redemption
   ledger — so this page does NOT show "Your coupons" / "Available offers"
   / "N used". It lets the user check a code and explains that codes are
   applied at checkout, where the SERVER computes the final fee.

   Validation goes through the validate_coupon RPC — the browser never
   reads the coupons table.
   ============================================================ */

import { useState } from 'react';
import Link from 'next/link';
import { Ticket, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { validateCoupon, COUPON_STATUS, COUPON_STATUS_MESSAGE } from '@/lib/coupons';
import { istDate } from '@/lib/marketTime';

export default function CouponCodesPage() {
  const { ready } = usePortalData();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { status, code, discountPercent, expiresAt }

  async function check(e) {
    e?.preventDefault();
    const c = code.trim();
    if (!c) return;
    setBusy(true);
    setResult(null);
    const r = await validateCoupon(c);
    setBusy(false);
    setResult(r);
  }

  const isValid = result?.status === COUPON_STATUS.VALID;
  const isTransientError =
    result?.status === COUPON_STATUS.BACKEND_ERROR || result?.status === COUPON_STATUS.BACKEND_MISSING;

  return (
    <div className="portal-dashboard" style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(245,185,62,.14)', border: '1px solid rgba(245,185,62,.3)', display: 'grid', placeItems: 'center' }} aria-hidden="true">
          <Ticket size={19} color="var(--gold)" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Coupon Codes</h1>
          <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>Check a promo code and see its discount.</p>
        </div>
      </div>

      {!ready ? (
        <div className="card" style={{ height: 150, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <form onSubmit={check}>
              <label htmlFor="cc-code" className="eyebrow" style={{ fontSize: 9, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}>Promo code</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  id="cc-code"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); if (result) setResult(null); }}
                  placeholder="Enter code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', fontFamily: 'ui-monospace, monospace', letterSpacing: '.04em' }}
                />
                <button type="submit" className="btn btn-grad btn-sm" disabled={busy || !code.trim()} style={{ minWidth: 92 }}>
                  {busy ? 'Checking…' : 'Check'}
                </button>
              </div>

              <div aria-live="polite" style={{ marginTop: result ? 14 : 0 }}>
                {isValid && (
                  <div role="status" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 8, background: 'rgba(34,197,139,.10)', border: '1px solid rgba(34,197,139,.3)' }}>
                    <CheckCircle2 size={18} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>
                      <b>{result.code}</b> — {result.discountPercent}% off your evaluation fee.
                      {result.expiresAt && <span className="muted"> Expires {istDate(result.expiresAt)}.</span>}
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Apply it on the payment step when you buy a challenge — the final fee is calculated there.
                      </div>
                    </div>
                  </div>
                )}

                {result && !isValid && !isTransientError && (
                  <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderRadius: 8, background: 'rgba(240,82,95,.10)', border: '1px solid rgba(240,82,95,.3)' }}>
                    <XCircle size={18} color="var(--red)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>
                      {COUPON_STATUS_MESSAGE[result.status] || 'That code can’t be used.'}
                      {result.status === COUPON_STATUS.EXPIRED && result.expiresAt && (
                        <span className="muted"> (expired {istDate(result.expiresAt)})</span>
                      )}
                    </span>
                  </div>
                )}

                {isTransientError && (
                  <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderRadius: 8, background: 'rgba(245,185,62,.10)', border: '1px solid rgba(245,185,62,.3)' }}>
                    <AlertTriangle size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{COUPON_STATUS_MESSAGE[result.status]}</span>
                  </div>
                )}
              </div>
            </form>

            {isValid && (
              <div style={{ marginTop: 14 }}>
                <Link href="/challenges" className="btn btn-line btn-sm">Browse challenges →</Link>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 13, margin: '0 0 10px', fontWeight: 700 }}>How coupons work</h2>
            <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
              <li>Codes are created by the FundedDesk team. There is no personal coupon wallet — a code is entered when you check out.</li>
              <li>A coupon takes a percentage off the one-time evaluation fee. It does not apply to payouts.</li>
              <li>Enter the code on the payment step in the <Link href="/challenges" style={{ color: 'var(--green)' }}>challenge</Link> flow. The discounted fee is computed by the server from the plan price, so what you’re charged is always the real amount.</li>
              <li>Coupons are separate from affiliate referrals — a referral link does not apply a coupon.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
