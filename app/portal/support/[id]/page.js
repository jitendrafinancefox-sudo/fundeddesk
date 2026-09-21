'use client';

/* ============================================================
   /portal/support/[id]  —  Ticket thread

   RLS ("tickets own read" + "ticket messages read") guarantees a trader
   can only ever load their own ticket + its messages. The frontend
   .eq('id', …) is convenience, NOT the security boundary — a ticket that
   isn't yours simply returns no row and we show "not found" without
   revealing whether the id exists.

   The trader replies through the reply_ticket RPC (author_role can't be
   forged). Messages are rendered as PLAIN TEXT — no HTML.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { categoryLabel, ticketStatusMeta, supportBackendMissing, replyToTicket } from '@/lib/support';
import { istDateTime, relativeAge } from '@/lib/marketTime';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { ready, userId } = usePortalData();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [account, setAccount] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | notfound | error | missing
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const endRef = useRef(null);

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setState('loading');
    const { data: t, error: te } = await supabase
      .from('support_tickets')
      .select('id, subject, category, status, message, created_at, updated_at, closed_at, account_id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (te) { setState(supportBackendMissing(te) ? 'missing' : 'error'); return; }
    if (!t || t.user_id !== userId) { setState('notfound'); return; }
    setTicket(t);

    const { data: msgs } = await supabase
      .from('support_ticket_messages')
      .select('id, author_role, body, created_at')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    setMessages(Array.isArray(msgs) ? msgs : []);

    if (t.account_id) {
      const { data: a } = await supabase.from('accounts').select('login_id').eq('id', t.account_id).maybeSingle();
      setAccount(a || null);
    } else {
      setAccount(null);
    }
    setState('ok');
  }, [userId, id]);

  useEffect(() => { if (userId) load(); }, [userId, load]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages.length, state]);

  async function sendReply(e) {
    e.preventDefault();
    setSendErr('');
    const body = reply.trim();
    if (body.length < 1) return;
    setSending(true);
    const res = await replyToTicket(id, body);
    setSending(false);
    if (!res.ok) { setSendErr(res.missing ? 'Replies are not available yet on this environment.' : res.error); return; }
    setReply('');
    await load();
  }

  if (!ready || state === 'loading') {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <BackLink />
        <div className="card" style={{ height: 260, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <BackLink />
        <div className="card" style={{ padding: '28px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Support threads aren&apos;t deployed</p>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Run <code>supabase/support.sql</code> to enable ticket detail.</p>
        </div>
      </div>
    );
  }

  if (state === 'notfound') {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <BackLink />
        <div className="card" style={{ padding: '28px 18px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Request not found</h2>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>This request doesn&apos;t exist or isn&apos;t on your account.</p>
          <Link href="/portal/support" className="btn btn-grad btn-sm">Back to Support</Link>
        </div>
      </div>
    );
  }

  if (state === 'error' || !ticket) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <BackLink />
        <div className="card" style={{ padding: '28px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', margin: '0 0 8px' }}>Unable to load this request.</p>
          <button className="btn btn-line btn-sm" onClick={load}>Try again</button>
        </div>
      </div>
    );
  }

  const m = ticketStatusMeta(ticket.status);

  return (
    <div className="portal-dashboard" style={{ maxWidth: 720 }}>
      <BackLink />

      <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 18, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', minWidth: 0 }}>{ticket.subject || '(no subject)'}</h1>
          <span className={`tag ${m.tag}`} style={{ fontSize: 10 }}>{m.label}</span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{categoryLabel(ticket.category)}</span>
          <span>· opened {istDateTime(ticket.created_at)}</span>
          {account?.login_id && <span>· account {account.login_id}</span>}
          {ticket.status === 'closed' && ticket.closed_at && <span>· closed {relativeAge(ticket.closed_at)}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 14 }}>
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Bubble role="trader" body={ticket.message} at={ticket.created_at} />
          {messages.map((msg) => <Bubble key={msg.id} role={msg.author_role} body={msg.body} at={msg.created_at} />)}
          <div ref={endRef} />
        </div>
      </div>

      {sendErr && <div className="err" role="alert" style={{ fontSize: 12.5, marginBottom: 10 }}>{sendErr}</div>}

      <form onSubmit={sendReply} className="card" style={{ padding: 14 }}>
        <label htmlFor="st-reply" className="eyebrow" style={{ fontSize: 9, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}>
          {ticket.status === 'closed' ? 'Reply (reopens this request)' : 'Add a reply'}
        </label>
        <textarea
          id="st-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Type your reply…"
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 14, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn btn-grad btn-sm" disabled={sending || reply.trim().length < 1}>
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
        <p className="dim" style={{ fontSize: 10.5, margin: '8px 0 0' }}>
          Replies are not emailed. The team responds in this thread.
        </p>
      </form>
    </div>
  );
}

function Bubble({ role, body, at }) {
  const isSupport = role === 'support';
  return (
    <div style={{ alignSelf: isSupport ? 'flex-start' : 'flex-end', maxWidth: '86%' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3, justifyContent: isSupport ? 'flex-start' : 'flex-end' }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: isSupport ? 'var(--green)' : 'var(--muted)' }}>
          {isSupport ? 'SUPPORT' : 'YOU'}
        </span>
        <span className="dim" style={{ fontSize: 10 }}>{relativeAge(at)}</span>
      </div>
      <div style={{
        background: isSupport ? 'rgba(34,197,139,0.08)' : 'var(--bg2)',
        border: `1px solid ${isSupport ? 'rgba(34,197,139,0.22)' : 'var(--line2)'}`,
        borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {/* plain text only — never dangerouslySetInnerHTML */}
        {body}
      </div>
    </div>
  );
}

function BackLink() {
  return <Link href="/portal/support" style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-block', marginBottom: 12 }}>← Support</Link>;
}
