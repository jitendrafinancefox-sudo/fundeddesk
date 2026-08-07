'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <div className="wrap">
      <div className="auth-box">
        <h1>Forgot password?</h1>
        <p className="sub">Enter your email and we’ll send you a reset link.</p>
        {!sent ? (
          <>
            <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
            <button className="btn btn-grad" style={{ width: '100%' }} onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 18, textAlign: 'center' }}>
              Back to <Link href="/login" style={{ color: 'var(--blue)' }}>Log In</Link>
            </p>
          </>
        ) : (
          <p style={{ fontSize: 14, textAlign: 'center' }}>
            Check your email for a reset link.
          </p>
        )}
      </div>
    </div>
  );
}
