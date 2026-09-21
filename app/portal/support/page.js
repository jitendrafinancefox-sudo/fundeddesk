'use client';

/* ============================================================
   /portal/support  —  Support Center

   Real backend: public.support_tickets (RLS: own read / own insert /
   admin write) + public.support_ticket_messages (RLS: read tickets you
   can see). The insert is server-sanitised (user_id = auth.uid(),
   email = auth.email(), account_id ownership-checked) by a trigger.

   No SLA, no email delivery, no live agent — the trader gets replies in
   the ticket thread. All of that is stated plainly, not implied.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { TICKET_CATEGORIES, categoryLabel, ticketStatusMeta, supportBackendMissing } from '@/lib/support';
import { relativeAge } from '@/lib/marketTime';

export default function SupportPage() {
  const { ready, error: ctxError, userId, accounts } = usePortalData();

  const [tickets, setTickets] = useState([]);
  const [state, setState] = useState('loading'); // loading | ok | error | missing
  const [tab, setTab] = useState('list'); // list | new

  const load = useCallback(async () => {
    if (!userId) return;
    setState('loading');
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, subject, category, status, created_at, updated_at, account_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { setState(supportBackendMissing(error) ? 'missing' : 'error'); return; }
    setTickets(Array.isArray(data) ? data : []);
    setState('ok');
  }, [userId]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  return (
    <div className="portal-dashboard" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(34,197,139,.12)', border: '1px solid rgba(34,197,139,.3)', display: 'grid', placeItems: 'center' }} aria-hidden="true">
          <LifeBuoy size={19} color="var(--green)" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Support Center</h1>
          <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>Raise a request and follow the reply thread here.</p>
        </div>
      </div>

      {!ready ? (
        <div className="card" style={{ height: 160, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : ctxError ? (
        <div className="card" style={{ padding: 24 }}><p className="err" role="alert" style={{ margin: 0 }}>Your session could not be loaded. <Link href="/login" style={{ color: 'var(--green)' }}>Sign in again</Link>.</p></div>
      ) : (
        <>
          <div role="tablist" aria-label="Support" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
            {[['list', 'My requests'], ['new', 'New request']].map(([k, l]) => {
              const on = tab === k;
              return (
                <button key={k} role="tab" aria-selected={on} onClick={() => setTab(k)}
                  style={{ padding: '9px 14px', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', color: on ? 'var(--text)' : 'var(--muted)', background: 'transparent', border: 'none', borderBottom: on ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1 }}>
                  {l}
                </button>
              );
            })}
          </div>

          {tab === 'new' ? (
            <NewTicket accounts={accounts} onCreated={() => { setTab('list'); load(); }} />
          ) : (
            <TicketList state={state} tickets={tickets} onRetry={load} onNew={() => setTab('new')} />
          )}

          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <h2 style={{ fontSize: 13, margin: '0 0 8px', fontWeight: 700 }}>Before you write in</h2>
            <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
              <li>Rule and breach questions: the <Link href="/rules" style={{ color: 'var(--green)' }}>Rulebook</Link> lists every condition.</li>
              <li>Payment not showing: allow up to an hour for manual verification, then raise an <b>Order / payment</b> request with your UTR.</li>
              <li>General questions: the <Link href="/faq" style={{ color: 'var(--green)' }}>FAQ</Link>.</li>
            </ul>
            <p className="dim" style={{ fontSize: 11, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
              Replies arrive in the ticket thread on this page. There is no email or live-chat channel, and no fixed
              response-time commitment.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function TicketList({ state, tickets, onRetry, onNew }) {
  if (state === 'loading') {
    return <div className="card" style={{ padding: 16 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 46, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />)}</div>;
  }
  if (state === 'missing') {
    return (
      <div className="card" style={{ padding: '28px 18px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Support is not fully deployed</p>
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Run <code>supabase/support.sql</code> to enable the request list and threads.</p>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="card" style={{ padding: '28px 18px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: 'var(--red)' }}>Unable to load support requests.</p>
        <button className="btn btn-line btn-sm" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (tickets.length === 0) {
    return (
      <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
        <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>You don&apos;t have any support requests yet.</p>
        <button className="btn btn-grad btn-sm" onClick={onNew}>Create a request</button>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      {tickets.map((t) => {
        const m = ticketStatusMeta(t.status);
        return (
          <Link key={t.id} href={`/portal/support/${t.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || '(no subject)'}</span>
              <span className={`tag ${m.tag}`} style={{ fontSize: 10, flexShrink: 0 }}>{m.label}</span>
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
              {categoryLabel(t.category)} · opened {relativeAge(t.created_at)}
              {t.updated_at && t.updated_at !== t.created_at ? ` · updated ${relativeAge(t.updated_at)}` : ''}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function NewTicket({ accounts, onCreated }) {
  const [category, setCategory] = useState('GENERAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const funded = useMemo(() => (accounts || []), [accounts]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (subject.trim().length < 3) { setErr('Add a short subject (at least 3 characters).'); return; }
    if (message.trim().length < 10) { setErr('Describe the issue in a bit more detail (at least 10 characters).'); return; }
    setBusy(true);
    const row = {
      subject: subject.trim().slice(0, 160),
      message: message.trim().slice(0, 5000),
      category,
      // name/email are required NOT NULL columns; the trigger overwrites
      // email with auth.email() server-side.
      name: 'Trader',
      email: 'pending@fundeddesk',
    };
    if (accountId) row.account_id = accountId;
    const { error } = await supabase.from('support_tickets').insert(row);
    setBusy(false);
    if (error) { setErr(supportBackendMissing(error) ? 'Support is not fully deployed yet.' : error.message); return; }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20 }}>
      {err && <div className="err" role="alert" style={{ fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="st-cat">Category</label>
        <select id="st-cat" value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)' }}>
          {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      {funded.length > 0 && (
        <div className="field">
          <label htmlFor="st-acc">Related account (optional)</label>
          <select id="st-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)' }}>
            <option value="">— none —</option>
            {funded.map((a) => <option key={a.id} value={a.id}>{a.login_id} · {a.plans?.name || a.plans?.plan_type || 'plan'}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="st-sub">Subject</label>
        <input id="st-sub" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} placeholder="One line summary" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="st-msg">Message</label>
        <textarea id="st-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={5000}
          placeholder="Describe the issue. Include order UTR / account ID where relevant."
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
      <button type="submit" className="btn btn-grad" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
        {busy ? 'Submitting…' : 'Submit request'}
      </button>
      <p className="dim" style={{ fontSize: 10.5, marginTop: 10, marginBottom: 0 }}>
        Your account email is attached automatically. Nothing is sent by email — track this request on the previous tab.
      </p>
    </form>
  );
}
