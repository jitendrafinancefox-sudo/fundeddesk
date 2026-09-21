'use client';
import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

/* Feature suggestions are stored as support_tickets rows with a
   "Feature Suggestion" subject prefix — a real, existing table. No
   submission is faked: the button is disabled until the row is written
   and the confirmation only shows after a successful insert. */

const AREAS = [
  'Web Terminal', 'Dashboard & Analytics', 'Payouts', 'Challenges & Pricing',
  'Accounts & Rules', 'Affiliate & Rewards', 'Mobile experience', 'Other',
];

export default function SuggestFeaturePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    if (!area) return setErr('Please pick which area this is about.');
    if (!title.trim()) return setErr('A short summary is required.');
    if (!message.trim()) return setErr('Please describe the idea.');

    setBusy(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user ? user.id : null,
      name: name.trim(),
      email: email.trim(),
      subject: `Feature Suggestion — ${area}: ${title.trim()}`,
      message: message.trim(),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="card" style={{ padding: '42px 28px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,139,.13)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
          <Lightbulb size={24} color="var(--green)" />
        </div>
        <h2 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>Suggestion received</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 4 }}>Thanks — your idea has been logged for the product team.</p>
        <p className="muted" style={{ fontSize: 13 }}>We review suggestions regularly and may reach out for more detail.</p>
        <button
          className="btn btn-sm"
          style={{ marginTop: 18, border: '1px solid var(--line2)' }}
          onClick={() => { setSubmitted(false); setArea(''); setTitle(''); setMessage(''); }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,185,62,.14)', border: '1px solid rgba(245,185,62,.28)', display: 'grid', placeItems: 'center' }}>
          <Lightbulb size={17} color="var(--gold)" />
        </div>
        <div>
          <h2 style={{ fontSize: 19, margin: 0 }}>Suggest a Feature</h2>
          <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 0' }}>Tell us what would make FundedDesk better for your trading.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <form onSubmit={submit} style={{ padding: 22 }}>
          {err && <div className="err" style={{ marginBottom: 14, fontSize: 12.5 }}>{err}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Which area is this about?</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} required
              style={{ padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', width: '100%' }}>
              <option value="">Select an area…</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Summary</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
              placeholder="One line describing the feature" required />
          </div>

          <div className="field">
            <label>Details</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What problem would this solve? How would you expect it to work?"
              rows={6}
              required
              style={{ width: '100%', padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <button type="submit" className="btn btn-grad" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Suggestion'}
          </button>
        </form>
      </div>
    </div>
  );
}
