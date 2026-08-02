'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      setName(data?.full_name || '');
      setPhone(data?.phone || '');
    });
  }, []);

  async function save() {
    setErr(''); setMsg(''); setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() || null }).eq('id', profile.id);
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg('Profile updated ✓');
  }

  if (!profile) return <p className="muted">Loading…</p>;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 22, marginBottom: 18 }}>Settings</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(34,197,139,.25),rgba(34,197,139,.05))', padding: '26px 0 20px', textAlign: 'center' }}>
          <div style={{ width: 66, height: 66, borderRadius: 18, background: 'var(--card2)', border: '2px solid var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', fontFamily: 'Manrope', fontWeight: 800, fontSize: 22, color: 'var(--green)' }}>
            {(name || profile.email || 'T')[0].toUpperCase()}
          </div>
          <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 17 }}>{name || 'Trader'}</div>
          <div className="dim" style={{ fontSize: 12.5 }}>{profile.email}</div>
        </div>
        <div style={{ padding: 24 }}>
          {err && <div className="err">{err}</div>}
          {msg && <div className="ok">{msg}</div>}
          <div className="field"><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Phone number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" /></div>
          <div className="field"><label>Email (login)</label><input value={profile.email || ''} disabled style={{ opacity: .6 }} /></div>
          <div className="field"><label>Role</label><input value={profile.role} disabled style={{ opacity: .6 }} /></div>
          <button className="btn btn-grad" style={{ width: '100%' }} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
