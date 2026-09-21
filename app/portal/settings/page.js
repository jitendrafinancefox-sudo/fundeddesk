'use client';

/* ============================================================
   /portal/settings  —  Profile · Security · Data & Privacy

   Source of truth
     - full_name / phone(*) / role / created_at  -> public.profiles (RLS own-row)
     - email / email_confirmed_at / MFA factors  -> Supabase Auth (browser client)
     (*) `phone` is a schema-drift column: the field only renders when the
         profiles row actually contains it.

   Nothing is faked. Every success state waits on a real DB/Auth response;
   unsupported capabilities say so:
     - avatar upload          -> no storage bucket  -> UNAVAILABLE
     - email change           -> no verified in-app flow -> UNAVAILABLE
     - device/session list    -> not exposed by the client SDK -> not shown
     - MFA                    -> real Supabase MFA; degrades to "not available"
                                 if the project has MFA disabled
     - account deletion       -> no safe client/RPC path -> support review
     - notification/marketing prefs -> no preference table -> not shown
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, KeyRound, LogOut, Smartphone, Download, Trash2, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { signOutLocal, signOutOtherDevices } from '@/lib/auth';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'data', label: 'Data & Privacy' },
];

export default function SettingsPage() {
  const { ready, error: ctxError, profile, userId, refresh } = usePortalData();
  const [tab, setTab] = useState('profile');

  if (!ready) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <div style={{ height: 26, width: 160, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div className="card" style={{ height: 260, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }
  if (ctxError) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <div className="card" style={{ padding: 24 }}>
          <p className="err" style={{ margin: 0 }} role="alert">
            Your session could not be loaded. <Link href="/login" style={{ color: 'var(--green)' }}>Sign in again</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-dashboard" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Manage your profile, sign-in security and your data.</p>
      </div>

      <div role="tablist" aria-label="Settings sections" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 14px', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer',
                color: on ? 'var(--text)' : 'var(--muted)', background: 'transparent', border: 'none',
                borderBottom: on ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && <ProfileTab profile={profile} userId={userId} onSaved={refresh} />}
      {tab === 'security' && <SecurityTab email={profile?.email || ''} />}
      {tab === 'data' && <DataTab userId={userId} />}
    </div>
  );
}

/* ===================== PROFILE ===================== */

function ProfileTab({ profile, userId, onSaved }) {
  const hasPhoneColumn = profile ? Object.prototype.hasOwnProperty.call(profile, 'phone') : false;

  const initial = useMemo(() => ({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  }), [profile]);

  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [baseline, setBaseline] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setFullName(initial.full_name);
    setPhone(initial.phone);
    setBaseline(initial);
  }, [initial]);

  const dirty = fullName.trim() !== baseline.full_name.trim() || (hasPhoneColumn && phone.trim() !== baseline.phone.trim());
  const avatarChar = (fullName || profile?.email || 'T').trim()[0]?.toUpperCase() || 'T';

  async function save() {
    setErr(''); setMsg('');
    if (!fullName.trim()) { setErr('Name is required.'); return; }
    if (hasPhoneColumn && phone.trim() && !/^[+\d][\d\s-]{5,19}$/.test(phone.trim())) {
      setErr('Enter a valid phone number (digits, spaces and dashes only).'); return;
    }
    setBusy(true);
    const patch = { full_name: fullName.trim() };
    if (hasPhoneColumn) patch.phone = phone.trim() || null;
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    setBusy(false);
    if (error) {
      setErr(/jwt|expired|not authenticated/i.test(error.message)
        ? 'Your session expired — please sign in again.'
        : error.message);
      return;
    }
    setBaseline({ full_name: fullName.trim(), phone: phone.trim() });
    setMsg('Profile updated.');
    onSaved?.(); // re-pull canonical profile so the topbar / dropdown update
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--card2, #141A2B)', border: '1px solid var(--line2)', display: 'grid', placeItems: 'center', fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--green)' }} aria-hidden="true">
          {avatarChar}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{fullName || 'Trader'}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Profile photo management is not available yet.</div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 14px', fontWeight: 700 }}>Profile details</h2>

        {err && <div className="err" role="alert" style={{ fontSize: 12.5 }}>{err}</div>}
        {msg && <div className="ok" role="status" style={{ fontSize: 12.5 }}>{msg}</div>}

        <div className="field">
          <label htmlFor="set-name">Full name</label>
          <input id="set-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={80} />
        </div>

        {hasPhoneColumn && (
          <div className="field">
            <label htmlFor="set-phone">Phone number</label>
            <input id="set-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" autoComplete="tel" inputMode="tel" maxLength={20} />
          </div>
        )}

        <div className="field">
          <label htmlFor="set-email">Email</label>
          <input id="set-email" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} aria-describedby="set-email-note" />
          <div id="set-email-note" className="dim" style={{ fontSize: 11, marginTop: 4 }}>
            Email changes are currently unavailable. Contact support to change your login email.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="set-role">Role</label>
            <input id="set-role" value={profile?.role || 'trader'} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="set-since">Member since</label>
            <input id="set-since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>

        <button className="btn btn-grad" style={{ width: '100%', marginTop: 18, opacity: !dirty || busy ? 0.55 : 1 }} onClick={save} disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

/* ===================== SECURITY ===================== */

function SecurityTab({ email }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <EmailVerificationCard email={email} />
      <ChangePasswordCard email={email} />
      <SessionsCard />
      <MfaCard />
    </div>
  );
}

function EmailVerificationCard({ email }) {
  const [state, setState] = useState('loading'); // loading | verified | unverified | error
  const [err, setErr] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let on = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!on) return;
      if (error) { setState('error'); setErr(error.message); return; }
      const u = data?.user;
      setState(u?.email_confirmed_at || u?.confirmed_at ? 'verified' : 'unverified');
    });
    return () => { on = false; };
  }, []);

  async function resend() {
    setResendMsg(''); setErr(''); setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) { setErr(error.message); return; }
    setResendMsg('Verification email sent. Check your inbox.');
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        {state === 'verified'
          ? <ShieldCheck size={17} color="var(--green)" />
          : <ShieldAlert size={17} color={state === 'unverified' ? 'var(--gold)' : 'var(--muted)'} />}
        <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Email verification</h2>
        {state === 'verified' && <span className="tag tag-green" style={{ fontSize: 10 }}>VERIFIED</span>}
        {state === 'unverified' && <span className="tag tag-gold" style={{ fontSize: 10 }}>VERIFICATION PENDING</span>}
      </div>
      {state === 'loading' && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Checking…</p>}
      {state === 'error' && <p className="err" role="alert" style={{ fontSize: 12.5, margin: 0 }}>{err}</p>}
      {state === 'verified' && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{email} is verified.</p>}
      {state === 'unverified' && (
        <>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            {email} has not been verified. Some actions may require a verified email.
          </p>
          {err && <p className="err" role="alert" style={{ fontSize: 12, margin: '0 0 8px' }}>{err}</p>}
          {resendMsg && <p className="ok" role="status" style={{ fontSize: 12, margin: '0 0 8px' }}>{resendMsg}</p>}
          <button className="btn btn-line btn-sm" onClick={resend} disabled={resending}>
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
        </>
      )}
    </div>
  );
}

function ChangePasswordCard({ email }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!cur || !next || !confirm) { setErr('All fields are required.'); return; }
    if (next.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    if (/^(.)\1+$/.test(next)) { setErr('Choose a less predictable password.'); return; }
    if (next !== confirm) { setErr('New passwords do not match.'); return; }
    if (next === cur) { setErr('New password must be different from the current one.'); return; }

    setBusy(true);
    // Re-authenticate to prove the current password (Supabase updateUser does not check it).
    const reauth = await supabase.auth.signInWithPassword({ email, password: cur });
    if (reauth.error) {
      setBusy(false);
      setErr(/invalid login credentials/i.test(reauth.error.message) ? 'Current password is incorrect.' : reauth.error.message);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCur(''); setNext(''); setConfirm('');
    setMsg('Your password has been updated.');
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <KeyRound size={16} color="var(--muted)" />
        <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Change password</h2>
      </div>
      {err && <div className="err" role="alert" style={{ fontSize: 12.5 }}>{err}</div>}
      {msg && <div className="ok" role="status" style={{ fontSize: 12.5 }}>{msg}</div>}
      <form onSubmit={submit}>
        {/* hidden username field for password managers */}
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="field">
          <label htmlFor="pw-cur">Current password</label>
          <input id="pw-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw-new">New password</label>
          <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-hint" />
          <div id="pw-hint" className="dim" style={{ fontSize: 11, marginTop: 4 }}>At least 8 characters.</div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="pw-confirm">Confirm new password</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-grad" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <p className="dim" style={{ fontSize: 10.5, marginTop: 10, marginBottom: 0 }}>
        You can also <Link href="/forgot-password" style={{ color: 'var(--green)' }}>reset your password by email</Link>.
      </p>
    </div>
  );
}

function SessionsCard() {
  const [expiresAt, setExpiresAt] = useState(null);
  const [confirmOthers, setConfirmOthers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(({ data }) => {
      if (on && data?.session?.expires_at) setExpiresAt(data.session.expires_at * 1000);
    });
    return () => { on = false; };
  }, []);

  async function otherDevices() {
    setBusy(true); setErr(''); setMsg('');
    const { error } = await signOutOtherDevices();
    setBusy(false);
    setConfirmOthers(false);
    if (error) { setErr(error.message || 'Could not sign out other sessions.'); return; }
    setMsg('Signed out of all other sessions.');
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <LogOut size={16} color="var(--muted)" />
        <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Sessions</h2>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 4px' }}>
        This device is signed in{expiresAt ? `; session valid until ${new Date(expiresAt).toLocaleString('en-IN')}` : ''}.
      </p>
      <p className="dim" style={{ fontSize: 11, margin: '0 0 12px' }}>
        A per-device session/login history is not available from the app.
      </p>
      {err && <div className="err" role="alert" style={{ fontSize: 12.5 }}>{err}</div>}
      {msg && <div className="ok" role="status" style={{ fontSize: 12.5 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-line btn-sm" onClick={() => signOutLocal('/')}>Sign out</button>
        {confirmOthers ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 12 }}>Sign out everywhere else?</span>
            <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={otherDevices} disabled={busy}>{busy ? '…' : 'Yes'}</button>
            <button className="btn btn-line btn-sm" onClick={() => setConfirmOthers(false)}>Cancel</button>
          </span>
        ) : (
          <button className="btn btn-line btn-sm" onClick={() => setConfirmOthers(true)}>Sign out all other devices</button>
        )}
      </div>
    </div>
  );
}

function MfaCard() {
  const [factors, setFactors] = useState(null); // null loading | [] none | [factor]
  const [loadErr, setLoadErr] = useState('');
  const [enroll, setEnroll] = useState(null); // { factorId, qr, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const enrollingRef = useRef(false);

  async function load() {
    setLoadErr('');
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setLoadErr(error.message); setFactors([]); return; }
    setFactors((data?.totp || []).filter((f) => f.status === 'verified'));
  }
  useEffect(() => { load(); }, []);

  async function startEnroll() {
    if (enrollingRef.current) return;
    enrollingRef.current = true;
    setErr(''); setMsg(''); setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
    setBusy(false);
    enrollingRef.current = false;
    if (error) {
      setErr(/not enabled|disabled|unsupported/i.test(error.message)
        ? 'Two-factor authentication is not available for this account yet.'
        : error.message);
      return;
    }
    setEnroll({ factorId: data.id, qr: data.totp?.qr_code || '', secret: data.totp?.secret || '' });
  }

  async function cancelEnroll() {
    if (enroll?.factorId) { try { await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }); } catch (e) {} }
    setEnroll(null); setCode(''); setErr('');
  }

  async function verify(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const ch = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (ch.error) { setBusy(false); setErr(ch.error.message); return; }
    const v = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.data.id, code: code.trim() });
    setBusy(false);
    if (v.error) { setErr(/invalid|incorrect/i.test(v.error.message) ? 'That code is not valid. Try the current one.' : v.error.message); return; }
    setEnroll(null); setCode(''); setMsg('Two-factor authentication is enabled.');
    load();
  }

  async function remove(factorId) {
    setBusy(true); setErr(''); setMsg('');
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false); setConfirmRemove(null);
    if (error) { setErr(error.message); return; }
    setMsg('Two-factor authentication removed.');
    load();
  }

  const hasFactor = Array.isArray(factors) && factors.length > 0;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Smartphone size={16} color="var(--muted)" />
        <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Two-factor authentication</h2>
        {hasFactor && <span className="tag tag-green" style={{ fontSize: 10 }}>ENABLED</span>}
      </div>

      {factors === null && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Checking…</p>}
      {loadErr && <p className="dim" style={{ fontSize: 12, margin: 0 }}>Two-factor status is unavailable: {loadErr}</p>}
      {err && <div className="err" role="alert" style={{ fontSize: 12.5 }}>{err}</div>}
      {msg && <div className="ok" role="status" style={{ fontSize: 12.5 }}>{msg}</div>}

      {factors !== null && !hasFactor && !enroll && !loadErr && (
        <>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            Two-factor authentication is not set up. Add an authenticator app (TOTP) for a second sign-in step.
          </p>
          <button className="btn btn-line btn-sm" onClick={startEnroll} disabled={busy}>
            {busy ? 'Preparing…' : 'Set up authenticator app'}
          </button>
        </>
      )}

      {enroll && (
        <form onSubmit={verify} style={{ marginTop: 4 }}>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            Scan this in your authenticator app, then enter the 6-digit code it shows.
          </p>
          {enroll.qr && (
            <div style={{ background: '#fff', padding: 10, borderRadius: 10, width: 'fit-content', marginBottom: 10 }}>
              {/* real QR from Supabase enroll response (SVG data URI) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qr} alt="Authenticator setup QR code" width={148} height={148} />
            </div>
          )}
          {enroll.secret && (
            <div className="dim" style={{ fontSize: 11, marginBottom: 10, wordBreak: 'break-all' }}>
              Manual key: <code>{enroll.secret}</code>
            </div>
          )}
          <div className="field" style={{ marginBottom: 10 }}>
            <label htmlFor="mfa-code">6-digit code</label>
            <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 160, letterSpacing: '.3em' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-grad btn-sm" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Enable'}</button>
            <button type="button" className="btn btn-line btn-sm" onClick={cancelEnroll} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}

      {hasFactor && (
        <div>
          {factors.map((f) => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px dashed var(--line)' }}>
              <div style={{ fontSize: 12.5 }}>
                {f.friendly_name || 'Authenticator app'}
                {f.created_at && <span className="dim" style={{ fontSize: 11 }}> · added {new Date(f.created_at).toLocaleDateString('en-IN')}</span>}
              </div>
              {confirmRemove === f.id ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 11 }}>Remove?</span>
                  <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => remove(f.id)} disabled={busy}>Yes</button>
                  <button className="btn btn-line btn-sm" onClick={() => setConfirmRemove(null)}>No</button>
                </span>
              ) : (
                <button className="btn btn-line btn-sm" onClick={() => setConfirmRemove(f.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== DATA & PRIVACY ===================== */

function DataTab({ userId }) {
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  async function exportData() {
    setExporting(true); setExportErr(''); setExportMsg('');
    try {
      const pull = async (name, q) => {
        const { data, error } = await q;
        return error ? { error: error.message } : (data || []);
      };

      const accounts = await pull('accounts', supabase.from('accounts').select('*').eq('user_id', userId));
      const accountIds = Array.isArray(accounts) ? accounts.map((a) => a.id) : [];

      const bundle = {
        exported_at: new Date().toISOString(),
        note: 'Records you are authorised to read under row-level security. No other users\' data, admin data or authentication secrets are included.',
        profile: await pull('profiles', supabase.from('profiles').select('*').eq('id', userId).maybeSingle()),
        accounts,
        orders: await pull('orders', supabase.from('orders').select('*').eq('user_id', userId)),
        payouts: await pull('payouts', supabase.from('payouts').select('*').eq('user_id', userId)),
        trades: accountIds.length ? await pull('trades', supabase.from('trades').select('*').in('account_id', accountIds)) : [],
        // No persistent production positions table exists and nothing would
        // ever write to one (see app/portal/page.js) — state that plainly
        // instead of running a query against a table that doesn't exist,
        // which previously leaked a raw Postgres error string into this
        // downloadable file.
        positions: 'Not tracked: FundedDesk does not record persistent open-position data for production accounts (no broker execution is connected). See "trades" above for closed trade history.',
        support_tickets: await pull('support_tickets', supabase.from('support_tickets').select('*').eq('user_id', userId)),
        referrals: await pull('referrals', supabase.from('referrals').select('*').eq('referrer_id', userId)),
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fundeddesk-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg('Your data file has been downloaded.');
    } catch (e) {
      setExportErr(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Download size={16} color="var(--muted)" />
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Export my data</h2>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px', lineHeight: 1.6 }}>
          Downloads a JSON file with the records you can read: your profile, accounts, orders, payouts, trades,
          positions, support requests and referral rows. It never includes other users&apos; data, admin data or
          authentication secrets.
        </p>
        {exportErr && <div className="err" role="alert" style={{ fontSize: 12.5 }}>{exportErr}</div>}
        {exportMsg && <div className="ok" role="status" style={{ fontSize: 12.5 }}>{exportMsg}</div>}
        <button className="btn btn-line btn-sm" onClick={exportData} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download my data (JSON)'}
        </button>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <UserRound size={16} color="var(--muted)" />
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Privacy</h2>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
          The full policy on what is collected, why, and how it is stored is on the{' '}
          <Link href="/portal/privacy" style={{ color: 'var(--green)' }}>Data &amp; Privacy</Link> page.
          Marketing and notification preferences are not configurable yet.
        </p>
      </div>

      <div className="card" style={{ padding: 18, border: '1px solid rgba(240,82,95,.28)', background: 'rgba(240,82,95,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Trash2 size={16} color="var(--red)" />
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Delete account</h2>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px', lineHeight: 1.6 }}>
          Account deletion requires support review. Trading and challenge records tied to financial audit are retained
          or anonymised per the privacy policy, so deletion cannot be self-serve. Submit a request and the team will
          process it.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/portal/support" className="btn btn-line btn-sm">Request account deletion</Link>
          <a href="mailto:privacy@fundeddesk.com?subject=Account%20deletion%20request" className="btn btn-line btn-sm">Email privacy@fundeddesk.com</a>
        </div>
      </div>
    </div>
  );
}
