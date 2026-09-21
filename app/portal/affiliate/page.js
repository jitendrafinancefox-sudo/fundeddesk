'use client';

/* ============================================================
   /portal/affiliate  —  Referral / affiliate workspace

   WHAT THE BACKEND ACTUALLY SUPPORTS TODAY
     - public.referrals            : one "code holder" row per user
                                     (referred_user_id IS NULL, code UNIQUE)
     - profiles.referred_by        : set at signup from ?ref=<code>
     - RPC create_affiliate_code() : server-side, collision-safe code minting
     - RPC get_affiliate_referrals(): anonymised list of the caller's sign-ups

   WHAT DOES NOT EXIST (shown as honest "Not configured", never faked)
     - affiliate enrolment / approval states
     - commission model / percentages / tiers
     - affiliate commission records
     - affiliate payout table  (public.payouts is TRADER payouts — not reused here)
     - order-level affiliate attribution
     - admin affiliate workflow

   No affiliate number is fabricated. Earnings / paid-out are "—" with
   provenance; referral / purchased counts come only from the RPC.
   ============================================================ */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';

function rpcMissing(error) {
  const msg = error?.message || '';
  return error?.code === '42883' || /does not exist|could not find|not found|schema cache/i.test(msg);
}

function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AffiliatePage() {
  const { ready, error: ctxError, userId } = usePortalData();

  const [code, setCode] = useState(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [codeError, setCodeError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null); // { kind:'not-configured'|'error', message? }

  const [referrals, setReferrals] = useState(null); // null = unknown, [] = confirmed empty
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState(null); // { kind:'not-configured'|'error', message? }

  const [origin, setOrigin] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    try {
      const o = window.location.origin;
      const host = window.location.hostname;
      if (o && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host)) setOrigin(o);
    } catch (e) {}
  }, []);

  async function loadCode() {
    if (!userId) return;
    setCodeLoading(true);
    setCodeError('');
    const { data, error } = await supabase
      .from('referrals')
      .select('code, created_at')
      .eq('referrer_id', userId)
      .is('referred_user_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) setCodeError(error.message);
    setCode(data?.code || null);
    setCodeLoading(false);
  }

  async function loadReferrals() {
    setRefLoading(true);
    setRefError(null);
    const { data, error } = await supabase.rpc('get_affiliate_referrals');
    if (error) {
      setRefError(rpcMissing(error) ? { kind: 'not-configured' } : { kind: 'error', message: error.message });
      setReferrals(null);
    } else {
      setReferrals(Array.isArray(data) ? data : []);
    }
    setRefLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    loadCode();
    loadReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function createCode() {
    setCreating(true);
    setCreateError(null);
    const { data, error } = await supabase.rpc('create_affiliate_code');
    setCreating(false);
    if (error) {
      setCreateError(rpcMissing(error) ? { kind: 'not-configured' } : { kind: 'error', message: error.message });
      return;
    }
    if (typeof data === 'string' && data) {
      setCode(data);
      loadReferrals();
    }
  }

  function copy(text, key) {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(key);
        setTimeout(() => setCopied(''), 2000);
      });
    } catch (e) {}
  }

  const referralCount = referrals ? referrals.length : null;
  const purchasedCount = referrals ? referrals.filter((r) => r.has_purchased).length : null;
  const link = code && origin ? `${origin}/signup?ref=${encodeURIComponent(code)}` : null;

  if (!ready) return <div className="portal-dashboard"><SkeletonPage /></div>;
  if (ctxError) return <div className="portal-dashboard"><ErrorCard>Could not load your session.</ErrorCard></div>;

  return (
    <div className="portal-dashboard">
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {copied ? 'Copied to clipboard' : ''}
      </span>

      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Affiliate Program</h1>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: 620, lineHeight: 1.6 }}>
          Share your referral link and track the sign-ups attributed to you. Commission accounting and affiliate
          payouts are not configured yet — those sections say so explicitly rather than showing estimates.
        </p>
      </div>

      {/* 1 — status + code + link */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Your referral code</h2>
          {!codeLoading && (
            <span className={`tag ${code ? 'tag-green' : 'tag-muted'}`} style={{ fontSize: 10 }}>
              {code ? 'ACTIVE' : 'NOT CREATED'}
            </span>
          )}
        </div>
        <div style={{ padding: 16 }}>
          {codeLoading ? (
            <div style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : codeError ? (
            <div className="err" style={{ margin: 0, fontSize: 12.5 }}>{codeError}</div>
          ) : code ? (
            <>
              <label htmlFor="aff-code" className="eyebrow" style={{ fontSize: 9, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}>Affiliate code</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <code id="aff-code" style={{ flex: '1 1 200px', minWidth: 0, padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, fontFamily: 'ui-monospace, monospace', letterSpacing: '.04em' }}>{code}</code>
                <button
                  onClick={() => copy(code, 'code')}
                  aria-label="Copy affiliate code"
                  className="btn btn-line btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {copied === 'code' ? <Check size={13} /> : <Copy size={13} />} {copied === 'code' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <label htmlFor="aff-link" className="eyebrow" style={{ fontSize: 9, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}>Referral link</label>
              {link ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    id="aff-link"
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                    style={{ flex: '1 1 240px', minWidth: 0, padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 12.5, color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}
                  />
                  <button
                    onClick={() => copy(link, 'link')}
                    aria-label="Copy referral link"
                    className="btn btn-line btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {copied === 'link' ? <Check size={13} /> : <Copy size={13} />} {copied === 'link' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  The full referral link will appear once the site domain is configured. Until then, share your code —
                  a new user enters it at sign-up (or appends <code>?ref={code}</code> to the sign-up URL).
                </p>
              )}
              <p className="dim" style={{ fontSize: 11, marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
                Anyone who signs up through your code is recorded as your referral. Purchase-level commission tracking
                is a separate, not-yet-configured system.
              </p>
            </>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
                You don&apos;t have a referral code yet. Creating one is instant and self-serve.
              </p>
              {createError?.kind === 'not-configured' ? (
                <div className="card" style={{ padding: '14px 16px', background: 'var(--bg2)' }}>
                  <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                    Referral code creation is not deployed yet. Run <code>supabase/affiliate.sql</code> to enable it.
                  </p>
                </div>
              ) : (
                <>
                  <button className="btn btn-grad btn-sm" onClick={createCode} disabled={creating}>
                    {creating ? 'Creating…' : 'Create referral code'}
                  </button>
                  {createError?.kind === 'error' && (
                    <div className="err" style={{ margin: '10px 0 0', fontSize: 12.5 }}>{createError.message}</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2 — KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <Kpi
          label="Referrals"
          value={refLoading ? '…' : referralCount == null ? '—' : String(referralCount)}
          sub="Sign-ups via your code"
          note={referralCount == null && !refLoading ? 'Not available' : undefined}
        />
        <Kpi
          label="Referrals with a purchase"
          value={refLoading ? '…' : purchasedCount == null ? '—' : String(purchasedCount)}
          sub="Have placed ≥ 1 order"
          note={purchasedCount == null && !refLoading ? 'Not available' : undefined}
        />
        <Kpi label="Commissions earned" value="—" sub="Confirmed affiliate commissions" note="Not configured" />
        <Kpi label="Paid out" value="—" sub="Paid affiliate commissions" note="Not configured" />
      </div>

      {/* 3 — referrals */}
      <SectionTitle right="Anonymised · from your referral code">Referrals</SectionTitle>
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        {refLoading ? (
          <div style={{ padding: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : refError?.kind === 'not-configured' ? (
          <div style={{ padding: '26px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">🏗️</div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Referral tracking is not deployed</p>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              Run <code>supabase/affiliate.sql</code> in Supabase to enable the referral list. No placeholder rows are shown.
            </p>
          </div>
        ) : refError?.kind === 'error' ? (
          <div className="err" style={{ margin: 16, fontSize: 12.5 }}>Could not load referrals: {refError.message}</div>
        ) : referrals && referrals.length === 0 ? (
          <div style={{ padding: '26px 18px', textAlign: 'center' }}>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>No referrals recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
              <thead>
                <tr>
                  <th scope="col" style={thStyle}>Referral</th>
                  <th scope="col" style={thStyle}>Joined</th>
                  <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Purchase</th>
                </tr>
              </thead>
              <tbody>
                {(referrals || []).map((r, i) => (
                  <tr key={`${r.referral_tag}-${i}`}>
                    <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.referral_tag}</td>
                    <td style={tdStyle}>{fmtDate(r.joined_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <span className={`tag ${r.has_purchased ? 'tag-green' : 'tag-muted'}`} style={{ fontSize: 10 }}>
                        {r.has_purchased ? 'Purchased' : 'No order'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4 — affiliate payouts (backend gap) */}
      <SectionTitle>Affiliate payouts</SectionTitle>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
          Affiliate payouts are not configured yet. There is no affiliate commission ledger or affiliate payout
          workflow in the platform, so no balance, request form or history is shown here.{' '}
          <b style={{ color: 'var(--text)' }}>This is separate from trader payouts</b> (the funded-account payout
          workspace at <Link href="/portal/payouts" style={{ color: 'var(--green)' }}>Payouts</Link>).
        </p>
      </div>

      {/* 5 — how it works */}
      <SectionTitle>How it works</SectionTitle>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <ol className="muted" style={{ fontSize: 12.5, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
          <li>Create your referral code and share your link (or the <code>?ref=</code> URL).</li>
          <li>When someone signs up through it, their profile is tagged with your code — that&apos;s the referral shown above.</li>
          <li>Commission terms, qualifying-purchase rules and affiliate payouts will appear here once the affiliate
            program economics are configured. No commission percentage is shown until then.</li>
        </ol>
      </div>

      {/* 6 — limitations */}
      <SectionTitle>Program limitations</SectionTitle>
      <div className="card" style={{ padding: 16 }}>
        <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li><b style={{ color: 'var(--text)' }}>No commission model.</b> No percentage, tier, fixed amount, eligible-product or refund rule exists in the database.</li>
          <li><b style={{ color: 'var(--text)' }}>No order attribution.</b> Checkout does not record a referral code or affiliate id on the order, so purchases can&apos;t yet be tied to an affiliate for accounting.</li>
          <li><b style={{ color: 'var(--text)' }}>No affiliate payout ledger.</b> <code>public.payouts</code> is trader payouts only and is not reused for affiliates.</li>
          <li><b style={{ color: 'var(--text)' }}>No enrolment / approval states.</b> Codes are self-serve; there is no pending / suspended / rejected status.</li>
          <li><b style={{ color: 'var(--text)' }}>No admin affiliate workflow.</b> Admin cannot approve affiliates, compute commissions or process affiliate payouts.</li>
          <li>Referral identities are anonymised (<code>REF-XXXX</code>). Email, name, phone and user ids of your referrals are never shown.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, margin: '4px 0 10px' }}>
      <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>{children}</h2>
      {right && <span className="muted" style={{ fontSize: 11 }}>{right}</span>}
    </div>
  );
}

function Kpi({ label, value, sub, note }) {
  return (
    <div className="card" style={{ padding: '12px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>{label}</span>
      <span style={{ fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 'clamp(15px,1.7vw,20px)', lineHeight: 1.1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {sub && <span className="muted" style={{ fontSize: 10 }}>{sub}</span>}
      {note && <span className="dim" style={{ fontSize: 9, letterSpacing: '.02em' }}>{note}</span>}
    </div>
  );
}

function ErrorCard({ children }) {
  return <div className="card" style={{ padding: 24, textAlign: 'center' }}><p className="err" style={{ margin: 0 }}>{children}</p></div>;
}

function SkeletonPage() {
  return (
    <>
      <div style={{ height: 26, width: 200, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div className="card" style={{ height: 150, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </>
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
