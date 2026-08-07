'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPassword() {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !checked.current) {
        checked.current = true;
        setReady(true);
        setLoading(false);
      }
    });

    const t = setTimeout(() => {
      if (!checked.current) {
        setErr('This reset link is invalid or expired, request a new one.');
        setLoading(false);
      }
    }, 5000);

    return () => { subscription?.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit() {
    if (pass.length < 6) return setErr('Password must be at least 6 characters.');
    if (pass !== confirm) return setErr('Passwords do not match.');
    setBusy(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => { window.location.href = '/login'; }, 2000);
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="auth-box">
          <h1>Reset password</h1>
          <p className="sub">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="wrap">
        <div className="auth-box">
          <h1>Reset password</h1>
          {err && <div className="err">{err}</div>}
          <p style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
            <Link href="/forgot-password" style={{ color: 'var(--blue)' }}>Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="auth-box">
        <h1>Reset password</h1>
        <p className="sub">Enter a new password below.</p>
        {done ? (
          <p style={{ fontSize: 14, textAlign: 'center' }}>
            Password updated. Redirecting to login…
          </p>
        ) : (
          <>
            {err && <div className="err">{err}</div>}
            <div className="field"><label>New password</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            <div className="field"><label>Confirm password</label><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
            <button className="btn btn-grad" style={{ width: '100%' }} onClick={submit} disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</button>
          </>
        )}
      </div>
    </div>
  );
}
