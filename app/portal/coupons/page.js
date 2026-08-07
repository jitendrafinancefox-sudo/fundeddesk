'use client';
import { useState } from 'react';
import { Ticket, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Page() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true); setResult(null);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', trimmed)
      .maybeSingle();
    setBusy(false);
    if (error) return setResult({ error: error.message });
    if (!data) return setResult({ invalid: true });
    const now = new Date();
    const expired = data.expires_at && new Date(data.expires_at) < now;
    if (!data.active || expired) {
      return setResult({ invalid: true, reason: !data.active ? 'This code is inactive.' : 'This code has expired.' });
    }
    setResult({ valid: true, data });
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Coupon Codes</h2>
      </div>
      <div style={{ padding: '22px' }}>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
          Enter a coupon code to check its discount and validity. Codes are created by the FundedDesk team.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            style={{ flex: 1, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)' }}
          />
          <button onClick={check} disabled={busy || !code.trim()} className="btn btn-grad btn-sm" style={{ minWidth: 80 }}>
            {busy ? 'Checking…' : 'Check'}
          </button>
        </div>

        {result?.error && <div className="err" style={{ padding: 12, borderRadius: 8 }}>{result.error}</div>}

        {result?.invalid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, background: 'rgba(240,82,95,.10)', border: '1px solid rgba(240,82,95,.3)', borderRadius: 8, color: 'var(--red)', fontSize: 13.5 }}>
            <XCircle size={18} />
            {result.reason || 'That code does not exist or is no longer valid.'}
          </div>
        )}

        {result?.valid && result.data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, background: 'rgba(34,197,139,.10)', border: '1px solid rgba(34,197,139,.3)', borderRadius: 8, color: 'var(--green)', fontSize: 13.5 }}>
            <CheckCircle size={18} />
            Valid — {result.data.discount_percent}% off your next challenge
            {result.data.expires_at && ` · expires ${new Date(result.data.expires_at).toLocaleDateString('en-IN', { day: 'short', month: 'short', year: 'numeric' })}`}
          </div>
        )}
      </div>
    </div>
  );
}
