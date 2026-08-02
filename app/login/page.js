'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) return setErr(error.message);
    window.location.href = '/portal';
  }

  return (
    <div className="wrap">
      <div className="auth-box">
        <h1>Welcome back</h1>
        <p className="sub">Log in to your trader dashboard.</p>
        {err && <div className="err">{err}</div>}
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
        <button className="btn btn-grad" style={{ width: '100%' }} onClick={submit} disabled={busy}>{busy ? 'Logging in…' : 'Log In'}</button>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 18, textAlign: 'center' }}>
          New here? <Link href="/signup" style={{ color: 'var(--blue)' }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
