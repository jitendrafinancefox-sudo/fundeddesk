'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    setRef(new URLSearchParams(window.location.search).get('ref') || '');
  }, []);

  async function submit() {
    setErr(''); setOk(''); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, ref_code: ref } },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOk('Account created! Check your email to confirm, then log in.');
  }

  return (
    <div className="wrap">
      <div className="auth-box">
        <h1>Create your account</h1>
        <p className="sub">Free to join. Pay only when you start a challenge.</p>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok">{ok}</div>}
        <div className="field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gaurav Rathore" /></div>
        <div className="field"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
        <div className="field"><label>Password</label><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Min 6 characters" /></div>
        <button className="btn btn-grad" style={{ width: '100%' }} onClick={submit} disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 18, textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--blue)' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
