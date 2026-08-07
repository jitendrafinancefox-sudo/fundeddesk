'use client';
import { useEffect, useState } from 'react';
import { Copy, Users, ExternalLink } from 'lucide-react';
import { supabase, fmt } from '@/lib/supabaseClient';

export default function Page() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(null);
  const [referredCount, setReferredCount] = useState(0);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      if (!u) return setLoading(false);

      // Generate or fetch the user's referral code.
      supabase
        .from('referrals')
        .select('code')
        .eq('referrer_id', u.id)
        .is('referred_user_id', null)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            setErr(error.message);
            setLoading(false);
            return;
          }
          if (data) {
            setCode(data.code);
            // Count how many profiles were referred by this code.
            supabase
              .from('profiles')
              .select('*', { count: 'exact' })
              .eq('referred_by', data.code)
              .then(({ count, error: countErr }) => {
                if (!countErr) setReferredCount(count || 0);
                setLoading(false);
              });
          } else {
            // No code yet — create one.
            const newCode = 'ref_' + u.id.slice(0, 8);
            supabase
              .from('referrals')
              .insert({ referrer_id: u.id, referred_user_id: null, code: newCode })
              .then(({ error: insertErr }) => {
                if (insertErr) setErr(insertErr.message);
                else setCode(newCode);
                setLoading(false);
              });
          }
        });
    });
  }, []);

  const shareLink = code ? `${window.location.origin}/signup?ref=${code}` : '';

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="muted">Loading…</p></div>;
  if (!user) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="muted">Log in to view your affiliate dashboard.</p></div>;
  if (err) return <div className="card" style={{ padding: 34 }}><div className="err">{err}</div></div>;

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Affiliate Program</h2>
      </div>
      <div style={{ padding: '22px' }}>
        {code && (
          <>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Your Referral Code</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <code style={{ flex: 1, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 14, fontFamily: 'monospace' }}>{code}</code>
                <button title="Copy code" onClick={() => copyToClipboard(code)} style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid var(--line2)', color: 'var(--muted)', cursor: 'pointer' }}><Copy size={14} /></button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Shareable Link</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input type="text" value={shareLink} readOnly style={{ flex: 1, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 13, border: '1px solid var(--line2)', color: 'var(--text)' }} />
                <button title={copied ? 'Copied!' : 'Copy link'} onClick={() => copyToClipboard(shareLink)} style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid var(--line2)', color: copied ? 'var(--green)' : 'var(--muted)', cursor: 'pointer' }}><Copy size={14} /></button>
              </div>
            </div>

            <a href={shareLink} target="_blank" rel="noopener noreferrer"
               style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--blue)', fontSize: 13, marginBottom: 24 }}>
              Open signup page <ExternalLink size={14} />
            </a>
          </>
        )}

          <div style={{ display: 'flex', gap: 26, alignItems: 'center', padding: 18, background: 'var(--bg2)', borderRadius: 10 }}>
            <div style={{ display: 'grid', placeItems: 'center' }}><Users size={24} color="var(--gold)" /></div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Manrope' }}>{referredCount}</div>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>friends referred</div>
            </div>
          </div>
      </div>
    </div>
  );
}
