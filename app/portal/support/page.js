'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Page() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      if (u) {
        setUser(u);
        setEmail(u.email || '');
        setName(u.user_metadata?.full_name || u.email?.split('@')[0] || '');
      }
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) return setErr('Name is required.');
    if (!email.trim()) return setErr('Email is required.');
    if (!subject.trim()) return setErr('Subject is required.');
    if (!message.trim()) return setErr('Message is required.');
    setBusy(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user ? user.id : null,
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card" style={{ padding: '42px 28px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,139,.13)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--green)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01l-1.51-1.51a2 2 0 0 0-2.83 2.83l4.34 4.34a2 2 0 0 0 2.83 0l8-8a2 2 0 0 0 0-2.83z" /></svg>
        </div>
        <h2 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>Ticket submitted</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 4 }}>Thank you for reaching out.</p>
        <p className="muted" style={{ fontSize: 13 }}>We'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Support</h2>
      </div>
      <form onSubmit={submit} style={{ padding: '22px' }}>
        {err && <div className="err" style={{ marginBottom: 14, fontSize: 12.5 }}>{err}</div>}
        <div className="field">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
        </div>
        <div className="field">
          <label>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        </div>
        <div className="field">
          <label>Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} required style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', width: '100%' }}>
            <option value="">Select a topic…</option>
            <option value="Account verification issue">Account verification issue</option>
            <option value="Payment / UTR not confirmed">Payment / UTR not confirmed</option>
            <option value="Technical bug or bug report">Technical bug or bug report</option>
            <option value="Billing question">Billing question</option>
            <option value="Feature request">Feature request</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question in as much detail as possible."
            rows={6}
            required
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
        <button type="submit" className="btn btn-grad" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Sending…' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
