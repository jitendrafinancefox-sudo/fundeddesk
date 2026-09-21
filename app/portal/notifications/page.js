'use client';

/* ============================================================
   /portal/notifications  —  Notification Center

   Source: public.notifications (Batch 13). Rows are written ONLY by
   server-side DB triggers on order / account / payout status transitions
   (supabase/notifications.sql). This page never creates a notification;
   it lists the caller's own rows (RLS-scoped) and can mark them read via
   the mark_notifications_read / mark_all_notifications_read RPCs.

   No email, no browser push, no preference toggles (no backend for any of
   those). Time is shown in IST. States: loading / list / empty / error /
   not-deployed are distinct.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { typeMeta, safeActionUrl, notifBackendMissing } from '@/lib/notifications';
import { relativeAge, istDateTime } from '@/lib/marketTime';

const PAGE_LIMIT = 50;

export default function NotificationsPage() {
  const router = useRouter();
  const { ready, error: ctxError, userId, refreshUnread } = usePortalData();

  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ok | error | missing
  const [tab, setTab] = useState('all'); // all | unread
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setState('loading');
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, action_url, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT);
    if (error) { setState(notifBackendMissing(error) ? 'missing' : 'error'); return; }
    setItems(Array.isArray(data) ? data : []);
    setState('ok');
  }, [userId]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  const unread = useMemo(() => items.filter((n) => !n.read_at), [items]);
  const shown = tab === 'unread' ? unread : items;

  async function markOne(n) {
    if (n.read_at) return true;
    const { error } = await supabase.rpc('mark_notifications_read', { p_ids: [n.id] });
    if (error) return false;
    setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    refreshUnread?.();
    return true;
  }

  async function open(n) {
    await markOne(n);
    const dest = safeActionUrl(n.action_url);
    if (dest) router.push(dest);
  }

  async function markAll() {
    setBusy(true);
    const { error } = await supabase.rpc('mark_all_notifications_read');
    setBusy(false);
    if (!error) { await load(); refreshUnread?.(); }
  }

  if (!ready || state === 'loading') {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <Head />
        <div className="card" style={{ padding: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (ctxError) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <Head />
        <div className="card" style={{ padding: 24 }}>
          <p className="err" role="alert" style={{ margin: 0 }}>Your session could not be loaded. <Link href="/login" style={{ color: 'var(--green)' }}>Sign in again</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-dashboard" style={{ maxWidth: 720 }}>
      <Head />

      {state === 'missing' && (
        <div className="card" style={{ padding: '30px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">🔔</div>
          <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Notifications aren&apos;t set up yet</h2>
          <p className="muted" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
            The <code>notifications</code> table and its triggers are not deployed on this environment. Run
            <code> supabase/notifications.sql</code> to enable it. Nothing is shown in the meantime.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="card" style={{ padding: '30px 22px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--red)' }}>Unable to load notifications</h2>
          <button className="btn btn-line btn-sm" onClick={load}>Try again</button>
        </div>
      )}

      {state === 'ok' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)', marginBottom: 12, flexWrap: 'wrap' }}>
            <div role="tablist" aria-label="Notification filter" style={{ display: 'flex', gap: 6 }}>
              {[['all', `All${items.length ? ` (${items.length})` : ''}`], ['unread', `Unread${unread.length ? ` (${unread.length})` : ''}`]].map(([k, label]) => {
                const on = tab === k;
                return (
                  <button key={k} role="tab" aria-selected={on} onClick={() => setTab(k)}
                    style={{ padding: '9px 12px', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', color: on ? 'var(--text)' : 'var(--muted)', background: 'transparent', border: 'none', borderBottom: on ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1 }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {unread.length > 0 && (
              <button className="btn btn-line btn-sm" onClick={markAll} disabled={busy}>{busy ? 'Marking…' : 'Mark all read'}</button>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {tab === 'unread' ? 'No unread notifications.' : "You have no notifications yet. Updates about your accounts, payouts and orders will appear here."}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {shown.map((n) => {
                const meta = typeMeta(n.type);
                const dest = safeActionUrl(n.action_url);
                return (
                  <div key={n.id} style={{ borderBottom: '1px solid var(--line)', background: n.read_at ? 'transparent' : 'rgba(34,197,139,0.04)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: n.read_at ? 'transparent' : 'var(--green)', border: n.read_at ? '1px solid var(--line2)' : 'none' }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, fontWeight: n.read_at ? 500 : 700 }}>{n.title}</span>
                        <span className={`tag ${meta.tag}`} style={{ fontSize: 9.5 }}>{meta.label}</span>
                        <span className="dim" style={{ fontSize: 10, fontWeight: 700 }}>{n.read_at ? 'READ' : 'UNREAD'}</span>
                      </div>
                      {n.body && <p className="muted" style={{ fontSize: 12.5, margin: '5px 0 0', lineHeight: 1.55 }}>{n.body}</p>}
                      <div className="dim" style={{ fontSize: 11, marginTop: 5 }}>
                        <span title={istDateTime(n.created_at) || undefined}>{relativeAge(n.created_at) || ''}</span>
                        {istDateTime(n.created_at) && <span> · {istDateTime(n.created_at)}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        {dest && <button className="btn btn-line btn-sm" onClick={() => open(n)}>Open →</button>}
                        {!n.read_at && <button className="btn btn-sm" style={{ border: '1px solid var(--line2)', color: 'var(--muted)' }} onClick={() => markOne(n)}>Mark read</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length >= PAGE_LIMIT && (
                <div className="muted" style={{ fontSize: 11.5, padding: '10px 16px' }}>Showing the {PAGE_LIMIT} most recent notifications.</div>
              )}
            </div>
          )}
        </>
      )}

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h2 style={{ fontSize: 13, margin: '0 0 6px', fontWeight: 700 }}>Delivery &amp; preferences</h2>
        <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          Notifications are in-app only. Email delivery, browser push and per-category preferences are not configured
          yet — see <Link href="/portal/settings" style={{ color: 'var(--green)' }}>Settings</Link>. Security events
          (password / email changes) are handled by Supabase Auth&apos;s own emails, not this list.
        </p>
      </div>
    </div>
  );
}

function Head() {
  return (
    <div style={{ marginBottom: 16 }}>
      <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Notifications</h1>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>Updates about your challenge orders, accounts and payouts.</p>
    </div>
  );
}
