'use client';

/* ============================================================
   /admin  —  Operations control center  (hardened, Batch 15)

   The client-side role check here is a UI gate ONLY. Real authorization
   is server-side: every money-flow mutation goes through a SECURITY
   DEFINER RPC (lib/admin.js -> supabase/admin-hardening.sql) that
   re-checks is_admin(), locks the row, is idempotent, and writes an
   admin_actions audit row. Direct table writes remain for low-risk
   fields already gated by "…admin…" RLS.

   Nothing is fabricated: every number is a real query; missing backend
   surfaces as an honest note, not a fake control.
   ============================================================ */

import { useEffect, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';
import ThemeToggle from '@/components/ThemeToggle';
import { approveOrder, rejectOrder, setPayoutStatus, setAccountStatus, replyTicket, setTicketStatus } from '@/lib/admin';
import { evaluateAccountRisk, reconcileAccountEquity } from '@/lib/riskEngine';

const TABS = ['Dashboard', 'Orders', 'Accounts', 'Users', 'Payouts', 'Coupons', 'Support'];

// Possible-duplicate-trade WARNING window (Phase 17). This is a heuristic
// only, not a correctness guarantee: two legitimate trades may genuinely
// share account+instrument+side+pnl (Phase 16 Q1), so this never blocks
// anything — it only asks the admin to confirm before proceeding. No
// existing timing convention in the repo applies to this (PriceBus.js's
// LIVE_WINDOW_MS is about market-data staleness, a different domain).
// Change this single constant to retune the warning's sensitivity.
const DUPLICATE_TRADE_WINDOW_SECONDS = 120;

// Client-generated identifier for ONE intentional "Add trade" submission
// (Phase 17). The database (admin_add_trade's request_id unique index) is
// the actual source of truth for idempotency — this is only how the
// browser tells the database "this is the same attempt" across a retry.
function newRequestId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [tradePnlByAccount, setTradePnlByAccount] = useState({}); // account_id -> Σ realized trades.pnl (reconciliation diagnostic)

  const [msg, setMsg] = useState(null); // { kind:'ok'|'err', text }
  const [busy, setBusy] = useState('');  // id of the row/action currently mutating
  const [confirm, setConfirm] = useState(null); // { title, detail, danger, run }
  const [tradeForm, setTradeForm] = useState({});
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: '', expires_at: '' });

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (prof?.role !== 'admin') { setDenied(true); setReady(true); return; }
    await loadAll();
    setReady(true);
  }

  async function loadAll() {
    setLoadErr('');
    const [o, a, u, p, t, act, c, tr] = await Promise.all([
      supabase.from('orders').select('*, plans(name, fee), profiles(email, full_name)').order('created_at', { ascending: false }).limit(200),
      supabase.from('accounts').select('*, plans(*), profiles(email)').order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('payouts').select('*, profiles(email), accounts(login_id)').order('created_at', { ascending: false }).limit(200),
      supabase.from('support_tickets').select('*, profiles(email, full_name)').order('status', { ascending: true }).order('created_at', { ascending: false }).limit(200),
      supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(25),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }).limit(200),
      // Realized trade P&L per account — for the equity reconciliation
      // diagnostic only. Database-side aggregate (Phase 19), not a raw
      // per-trade scan: admin_trade_pnl_by_account() returns one
      // {account_id, total_pnl} row per account, computed via SUM/GROUP
      // BY in Postgres — see supabase/admin-trade-pnl-reconciliation.sql.
      supabase.rpc('admin_trade_pnl_by_account'),
    ]);
    const firstErr = [o, a, u, p, t, act, c, tr].map((r) => r.error).find(Boolean);
    if (firstErr) setLoadErr(firstErr.message);
    setOrders(o.data || []); setAccounts(a.data || []); setUsers(u.data || []);
    setPayouts(p.data || []); setTickets(t.data || []); setActivities(act.data || []); setCoupons(c.data || []);
    // Each account_id appears exactly once (the RPC already GROUP BY'd),
    // so this is a direct assignment, not an accumulation.
    const pnlMap = {};
    for (const row of tr.data || []) pnlMap[row.account_id] = Number(row.total_pnl) || 0;
    setTradePnlByAccount(pnlMap);
  }

  function flash(kind, text) { setMsg({ kind, text }); setTimeout(() => setMsg(null), 5000); }

  // ---- hardened money-flow handlers (RPC-backed) ----
  async function runRpc(id, fn) {
    setBusy(id);
    const res = await fn();
    setBusy('');
    setConfirm(null);
    if (!res.ok) { flash('err', res.error); return; }
    flash('ok', res.data?.note ? res.data.note : 'Done.');
    await loadAll();
  }

  function askApproveOrder(o) {
    setConfirm({
      title: 'Approve order',
      detail: `${o.plans?.name || 'Plan'} · ${o.profiles?.email || 'user'} · ${fmt(o.fee_amount ?? o.plans?.fee)}. A funded account will be created for this user.`,
      run: () => runRpc(o.id, () => approveOrder(o.id)),
    });
  }
  function askRejectOrder(o) {
    setConfirm({
      title: 'Reject order', danger: true,
      detail: `${o.plans?.name || 'Plan'} · ${o.profiles?.email || 'user'}. The order is marked rejected; no account is created.`,
      run: () => runRpc(o.id, () => rejectOrder(o.id)),
    });
  }
  function askPayout(p, status) {
    setConfirm({
      title: status === 'paid' ? 'Mark payout paid' : 'Reject payout',
      danger: status === 'rejected',
      detail: `${fmt(p.amount)} · account ${p.accounts?.login_id || '—'} · ${p.profiles?.email || 'user'}.` +
        (status === 'paid' ? ' Confirm the money has actually been sent.' : ''),
      run: () => runRpc(p.id, () => setPayoutStatus(p.id, status)),
    });
  }
  function askAccountStatus(a, status) {
    setConfirm({
      title: status === 'breached' ? 'Breach account' : status === 'active' ? 'Re-activate account' : 'Mark account passed',
      danger: status === 'breached',
      detail: `${a.login_id} (${a.profiles?.email || 'user'}) — status ${a.status} → ${status}.`,
      run: () => runRpc(a.id, () => setAccountStatus(a.id, status, null)),
    });
  }

  // ---- low-risk direct writes (already gated by "…admin…" RLS) ----
  async function updateAccountField(id, patch, note) {
    setBusy(id);
    const { error } = await supabase.from('accounts').update(patch).eq('id', id);
    setBusy('');
    if (error) { flash('err', error.message); return; }
    try { await supabase.rpc('log_admin_action', { p_action: 'account.update', p_table: 'accounts', p_row: id, p_details: patch }); } catch (e) {}
    flash('ok', note); await loadAll();
  }

  // Entry point for the "Add trade" button (Phase 17). Validates the form,
  // ensures this submission has a stable request id, runs a read-only
  // possible-duplicate check, and either asks for confirmation or submits
  // directly. This function never mutates anything itself — submitTrade()
  // (below), via the atomic RPC, is the only path that does.
  async function addTradeClicked(acc) {
    const f = tradeForm[acc.id] || {};
    const pnl = parseInt(f.pnl, 10);
    if (!f.instrument || !f.side || Number.isNaN(pnl)) return flash('err', 'Fill instrument, side and P&L (whole number, negative for a loss).');

    // One request id per intentional submission: reused across a retry of
    // the SAME form values (so the database recognizes it as a replay),
    // regenerated the moment any field actually changes (each onChange
    // handler below does this) — so an edited resubmission is correctly
    // treated as a new intended trade, never silently merged with a prior
    // failed attempt.
    const requestId = f.requestId || newRequestId();
    if (!f.requestId) setTradeForm((prev) => ({ ...prev, [acc.id]: { ...(prev[acc.id] || f), requestId } }));

    setBusy('trade-' + acc.id);
    const sinceIso = new Date(Date.now() - DUPLICATE_TRADE_WINDOW_SECONDS * 1000).toISOString();
    const { data: recent } = await supabase
      .from('trades')
      .select('id, traded_at')
      .eq('account_id', acc.id)
      .eq('instrument', f.instrument.toUpperCase())
      .eq('side', f.side)
      .eq('pnl', pnl)
      .gte('traded_at', sinceIso)
      .order('traded_at', { ascending: false })
      .limit(1);
    setBusy('');

    const match = recent && recent[0];
    if (match) {
      const secondsAgo = Math.max(0, Math.round((Date.now() - new Date(match.traded_at).getTime()) / 1000));
      setConfirm({
        title: 'Possible duplicate trade',
        danger: false,
        detail: `${acc.login_id} · ${f.instrument.toUpperCase()} · ${f.side} · P&L ${pnl >= 0 ? '+' : ''}${pnl} — a matching trade was recorded ${secondsAgo}s ago. ` +
          'This may be a genuine repeat trade, or an accidental resubmission. Only proceed if you intend to record this as a separate, real trade.',
        run: () => { setConfirm(null); submitTrade(acc, requestId); },
      });
      return;
    }
    await submitTrade(acc, requestId);
  }

  // The only code path that calls admin_add_trade. Trade insert + equity
  // update + audit log run inside ONE database transaction (Phase 13),
  // now with request-level idempotency (Phase 17): a retry using the same
  // requestId is recognized by the database and returns the original
  // trade instead of creating a second one. See
  // supabase/trade-request-idempotency.sql for the full rationale.
  async function submitTrade(acc, requestId) {
    const f = tradeForm[acc.id] || {};
    const pnl = parseInt(f.pnl, 10);
    setBusy('trade-' + acc.id);
    const { data: rpcResult, error: e1 } = await supabase.rpc('admin_add_trade', {
      p_account_id: acc.id,
      p_instrument: f.instrument.toUpperCase(),
      p_side: f.side,
      p_pnl: pnl,
      p_request_id: requestId,
    });
    setBusy('');
    if (e1) return flash('err', e1.message);
    const newEquity = Number(rpcResult?.equity);
    const replay = rpcResult?.idempotent_replay === true;
    // Clears requestId along with the rest of the form — the NEXT trade
    // this admin enters (even for the same account) gets a fresh id.
    setTradeForm({ ...tradeForm, [acc.id]: {} });

    // Canonical, INDICATIVE risk check (lib/riskEngine) — surface a breach for
    // the operator to apply via the audited Breach button; never auto-transition.
    let riskNote = '';
    try {
      const { data: accTrades } = await supabase
        .from('trades').select('pnl, traded_at, instrument, side').eq('account_id', acc.id);
      const r = evaluateAccountRisk({ ...acc, equity: newEquity }, acc.plans, { trades: accTrades || [] });
      if (r?.evaluation?.breached && acc.status !== 'breached') {
        riskNote = ' — canonical evaluation now shows a BREACH (' +
          r.evaluation.breachReasons.map((x) => x.label).join('; ') +
          '). Use Breach to apply it.';
      }
    } catch (e) {}
    flash(riskNote ? 'err' : 'ok', (replay ? 'Trade already recorded — safe retry, no duplicate created.' : 'Trade added.') + riskNote);
    await loadAll();
  }

  function askToggleRole(u) {
    const to = u.role === 'admin' ? 'trader' : 'admin';
    setConfirm({
      title: to === 'admin' ? 'Grant admin access' : 'Revoke admin access',
      danger: to === 'admin',
      detail: to === 'admin'
        ? `${u.email} will be able to approve orders, mark payouts paid, and change account states.`
        : `${u.email} will lose admin access.`,
      run: async () => {
        setBusy(u.id);
        const { error } = await supabase.from('profiles').update({ role: to }).eq('id', u.id);
        setBusy(''); setConfirm(null);
        if (error) { flash('err', error.message); return; }
        try { await supabase.rpc('log_admin_action', { p_action: 'role.' + to, p_table: 'profiles', p_row: u.id, p_details: {} }); } catch (e) {}
        flash('ok', `${u.email} is now ${to}.`); await loadAll();
      },
    });
  }

  const [openTicket, setOpenTicket] = useState(null); // ticket id whose thread is expanded
  const [thread, setThread] = useState({ loading: false, missing: false, msgs: [], subject: null, message: null, status: null });
  const [adminReply, setAdminReply] = useState('');

  async function toggleThread(t) {
    if (openTicket === t.id) { setOpenTicket(null); return; }
    setOpenTicket(t.id);
    setAdminReply('');
    setThread({ loading: true, missing: false, msgs: [], subject: t.subject, message: t.message, status: t.status });
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select('id, author_role, body, created_at')
      .eq('ticket_id', t.id)
      .order('created_at', { ascending: true });
    if (error) {
      const missing = error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
      setThread((s) => ({ ...s, loading: false, missing }));
      return;
    }
    setThread((s) => ({ ...s, loading: false, msgs: data || [] }));
  }

  async function sendAdminReply(t) {
    const body = adminReply.trim();
    if (!body) return;
    setBusy('reply-' + t.id);
    const res = await replyTicket(t.id, body);
    setBusy('');
    if (!res.ok) { flash('err', res.error); return; }
    setAdminReply('');
    await toggleThreadReload(t);
    flash('ok', 'Reply sent.');
  }
  async function toggleThreadReload(t) {
    const { data } = await supabase.from('support_ticket_messages').select('id, author_role, body, created_at').eq('ticket_id', t.id).order('created_at', { ascending: true });
    setThread((s) => ({ ...s, msgs: data || [] }));
  }

  async function ticketStatus(t, status) {
    setBusy(t.id);
    const res = await setTicketStatus(t.id, status);
    setBusy('');
    if (!res.ok) { flash('err', res.error); return; }
    flash('ok', `Ticket ${status}.`); await loadAll();
  }

  async function toggleCoupon(c) {
    setBusy(c.id);
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id);
    setBusy('');
    if (error) { flash('err', error.message); return; }
    try { await supabase.rpc('log_admin_action', { p_action: 'coupon.' + (!c.active ? 'activate' : 'deactivate'), p_table: 'coupons', p_row: c.id, p_details: {} }); } catch (e) {}
    flash('ok', `${c.code} ${!c.active ? 'activated' : 'deactivated'}.`); await loadAll();
  }

  async function createCoupon(e) {
    e.preventDefault();
    const code = newCoupon.code.trim().toUpperCase();
    const pct = parseInt(newCoupon.discount_percent, 10);
    if (!code) return flash('err', 'Enter a code.');
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) return flash('err', 'Discount must be a whole number 0–100.');
    setBusy('new-coupon');
    const row = { code, discount_percent: pct, active: true };
    if (newCoupon.expires_at) row.expires_at = new Date(newCoupon.expires_at).toISOString();
    const { error } = await supabase.from('coupons').insert(row);
    setBusy('');
    if (error) { flash('err', /duplicate|unique/i.test(error.message) ? 'That code already exists.' : error.message); return; }
    try { await supabase.rpc('log_admin_action', { p_action: 'coupon.create', p_table: 'coupons', p_row: null, p_details: { code, discount_percent: pct } }); } catch (e2) {}
    setNewCoupon({ code: '', discount_percent: '', expires_at: '' });
    flash('ok', `Coupon ${code} created.`); await loadAll();
  }

  if (!ready) return <div className="wrap" style={{ padding: '80px 0' }}><p className="muted">Checking admin access…</p></div>;

  if (denied) {
    return (
      <div className="wrap" style={{ padding: '80px 0', maxWidth: 480 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Permission denied</h2>
          <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px' }}>This area is for FundedDesk operations staff only.</p>
          <a href="/portal" className="btn btn-grad btn-sm">Back to portal</a>
        </div>
      </div>
    );
  }

  const pending = orders.filter((o) => o.status === 'pending');
  const requestedPayouts = payouts.filter((p) => p.status === 'requested');
  const openTickets = tickets.filter((t) => t.status === 'open');
  const breached = accounts.filter((a) => a.status === 'breached');

  return (
    <main>
      <section style={{ paddingTop: 44, paddingBottom: 72 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
            <h2 style={{ fontSize: 26 }}>Operations</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <span className="tag tag-gold">ADMIN</span>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 18, fontSize: 13 }}>
            {users.length} users · {accounts.length} accounts · {pending.length} pending orders · {requestedPayouts.length} pending payouts · {openTickets.length} open tickets
          </p>

          {loadErr && <div className="err" style={{ marginBottom: 14 }}>Some data failed to load: {loadErr}</div>}
          {msg && <div className={msg.kind === 'ok' ? 'ok' : 'err'} role="status" style={{ marginBottom: 14 }}>{msg.text}</div>}

          <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
            {TABS.map((t) => {
              const badge = t === 'Orders' ? pending.length : t === 'Payouts' ? requestedPayouts.length : t === 'Support' ? openTickets.length : 0;
              return (
                <button key={t} className="btn btn-sm" onClick={() => setTab(t)}
                  style={tab === t ? { background: 'var(--grad)', color: '#fff' } : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                  {t}{badge > 0 ? ` (${badge})` : ''}
                </button>
              );
            })}
          </div>

          {tab === 'Dashboard' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
                <Kpi label="Users" value={users.length} />
                <Kpi label="Active accounts" value={accounts.filter((a) => a.status === 'active').length} color="var(--green)" />
                <Kpi label="Funded accounts" value={accounts.filter((a) => a.phase === 'funded').length} color="var(--green)" />
                <Kpi label="Breached" value={breached.length} color="var(--red)" />
                <Kpi label="Pending orders" value={pending.length} color="var(--gold)" />
                <Kpi label="Pending payouts" value={fmt(requestedPayouts.reduce((s, p) => s + (p.amount || 0), 0))} color="var(--red)" />
                <Kpi label="Approved-order fees" value={fmt(orders.filter((o) => o.status === 'approved').reduce((s, o) => s + (o.fee_amount ?? o.plans?.fee ?? 0), 0))} color="var(--blue)" />
                <Kpi label="Payouts marked paid" value={fmt(payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0))} color="var(--green)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                <div className="card">
                  <h3 style={{ fontSize: 15, marginBottom: 12 }}>Needs attention</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pending.length > 0 && <span className="tag tag-gold" style={{ padding: '4px 10px' }}>{pending.length} pending orders</span>}
                    {requestedPayouts.length > 0 && <span className="tag tag-red" style={{ padding: '4px 10px' }}>{requestedPayouts.length} pending payouts</span>}
                    {openTickets.length > 0 && <span className="tag tag-blue" style={{ padding: '4px 10px' }}>{openTickets.length} open tickets</span>}
                    {breached.length > 0 && <span className="tag tag-red" style={{ padding: '4px 10px' }}>{breached.length} breached accounts</span>}
                    {pending.length + requestedPayouts.length + openTickets.length + breached.length === 0 && <span className="muted" style={{ fontSize: 13 }}>All caught up.</span>}
                  </div>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: 15, marginBottom: 12 }}>Recent admin actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflow: 'auto' }}>
                    {activities.length > 0 ? activities.map((a) => (
                      <div key={a.id} style={{ fontSize: 12.5 }}>
                        <span className="muted" style={{ fontSize: 11 }}>{new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {' · '}<b>{a.action}</b> <span className="muted">{a.table_name}</span>
                      </div>
                    )) : <span className="muted" style={{ fontSize: 13 }}>No actions logged yet.</span>}
                  </div>
                </div>
              </div>

              <p className="muted" style={{ fontSize: 11.5, marginTop: 18, lineHeight: 1.6, maxWidth: 640 }}>
                Not in Admin yet (no backend / handled elsewhere): rewards / Gold Coins (no backend), affiliate earnings
                (no commission model), notification authoring (system notifications are trigger-generated only), plan &amp;
                rule editing (resolver-driven; edit <code>plans</code> in the database), leaderboard moderation.
              </p>
            </>
          )}

          {tab === 'Orders' && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl num" style={{ minWidth: 760 }}>
                <thead><tr><th style={{ paddingLeft: 20 }}>User</th><th>Plan</th><th>Type</th><th>Fee</th><th>UTR</th><th>Status</th><th>Date</th><th style={{ paddingRight: 20 }}>Action</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ paddingLeft: 20 }}>{o.profiles?.full_name || '—'}<div className="muted" style={{ fontSize: 11.5 }}>{o.profiles?.email}</div></td>
                      <td>{o.plans?.name || '—'}</td>
                      <td><span className="tag tag-blue" style={{ fontSize: 10 }}>{o.eval_type || '—'}</span></td>
                      <td>{fmt(o.fee_amount ?? o.plans?.fee)}{o.coupon_code ? <div className="muted" style={{ fontSize: 10.5 }}>{o.coupon_code} · {o.discount_percent}%</div> : null}</td>
                      <td className="muted" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.utr || '—'}</td>
                      <td><Badge s={o.status} /></td>
                      <td className="muted">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 20 }}>
                        {o.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-green btn-sm" disabled={busy === o.id} onClick={() => askApproveOrder(o)}>{busy === o.id ? '…' : 'Approve'}</button>
                            <button className="btn btn-red btn-sm" disabled={busy === o.id} onClick={() => askRejectOrder(o)}>Reject</button>
                          </div>
                        ) : <span className="muted" style={{ fontSize: 11.5 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={8} className="muted" style={{ padding: 24, textAlign: 'center' }}>No orders.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Accounts' && (
            <>
              {accounts.map((a) => {
                const f = tradeForm[a.id] || {};
                return (
                  <div className="card" key={a.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 16 }}>{a.login_id}</h3>
                          <Badge s={a.status} /><span className="tag tag-blue" style={{ fontSize: 10 }}>{a.phase}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>{a.profiles?.email} · {a.plans?.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20 }}>{fmt(a.equity)}</div>
                        <ReconChip recon={reconcileAccountEquity(a, a.plans, [{ pnl: tradePnlByAccount[a.id] || 0 }])} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <select value={a.phase} disabled={busy === a.id}
                        onChange={(e) => updateAccountField(a.id, { phase: e.target.value }, `${a.login_id} phase → ${e.target.value}`)}
                        style={{ width: 'auto' }} aria-label={`Phase for ${a.login_id}`}>
                        <option value="phase1">phase1</option><option value="phase2">phase2</option><option value="funded">funded</option>
                      </select>
                      <button className="btn btn-red btn-sm" disabled={busy === a.id} onClick={() => askAccountStatus(a, 'breached')}>Breach</button>
                      <button className="btn btn-green btn-sm" disabled={busy === a.id} onClick={() => askAccountStatus(a, 'active')}>Activate</button>
                      <button className="btn btn-line btn-sm" disabled={busy === a.id} onClick={() => updateAccountField(a.id, { day_start_equity: a.equity }, `Day-start equity reset for ${a.login_id}`)}>Reset day</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Editing any field regenerates requestId — an edited
                          resubmission is a NEW intended trade, never merged
                          with a prior failed attempt's request id. */}
                      <input placeholder="Instrument" value={f.instrument || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, instrument: e.target.value, requestId: newRequestId() } })} style={{ width: 130 }} aria-label="Instrument" />
                      <select value={f.side || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, side: e.target.value, requestId: newRequestId() } })} style={{ width: 100 }} aria-label="Side">
                        <option value="">Side</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
                      </select>
                      <input placeholder="P&L ₹ (−ve = loss)" value={f.pnl || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, pnl: e.target.value, requestId: newRequestId() } })} style={{ width: 160 }} aria-label="P and L" />
                      <button className="btn btn-grad btn-sm" disabled={busy === 'trade-' + a.id} onClick={() => addTradeClicked(a)}>{busy === 'trade-' + a.id ? '…' : 'Add trade'}</button>
                    </div>
                  </div>
                );
              })}
              {accounts.length === 0 && <div className="card muted" style={{ textAlign: 'center', padding: 24 }}>No accounts. Approve an order first.</div>}
            </>
          )}

          {tab === 'Users' && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: 620 }}>
                <thead><tr><th style={{ paddingLeft: 20 }}>Name</th><th>Email</th><th>Role</th><th>Joined</th><th style={{ paddingRight: 20 }}>Action</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ paddingLeft: 20 }}>{u.full_name || '—'}</td>
                      <td className="muted">{u.email}</td>
                      <td><span className={'tag ' + (u.role === 'admin' ? 'tag-gold' : 'tag-blue')} style={{ fontSize: 10 }}>{u.role}</span></td>
                      <td className="muted">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 20 }}>
                        <button className="btn btn-line btn-sm" disabled={busy === u.id} onClick={() => askToggleRole(u)}>
                          {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Payouts' && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl num" style={{ minWidth: 640 }}>
                <thead><tr><th style={{ paddingLeft: 20 }}>Account</th><th>User</th><th>Amount</th><th>Status</th><th>Requested</th><th style={{ paddingRight: 20 }}>Action</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 20 }}>{p.accounts?.login_id || '—'}</td>
                      <td className="muted">{p.profiles?.email}</td>
                      <td className="green">{fmt(p.amount)}</td>
                      <td><Badge s={p.status} /></td>
                      <td className="muted">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 20 }}>
                        {p.status === 'requested' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-green btn-sm" disabled={busy === p.id} onClick={() => askPayout(p, 'paid')}>{busy === p.id ? '…' : 'Mark paid'}</button>
                            <button className="btn btn-red btn-sm" disabled={busy === p.id} onClick={() => askPayout(p, 'rejected')}>Reject</button>
                          </div>
                        ) : <span className="muted" style={{ fontSize: 11.5 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && <tr><td colSpan={6} className="muted" style={{ padding: 24, textAlign: 'center' }}>No payout requests.</td></tr>}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: 11, padding: '10px 16px', margin: 0 }}>
                Only <code>paid</code> / <code>rejected</code> transitions from <code>requested</code> are possible.
                Processed date, payment reference and rejection reason are not stored by the schema.
              </p>
            </div>
          )}

          {tab === 'Coupons' && (
            <>
              <form onSubmit={createCoupon} className="card" style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="nc-code">Code</label>
                  <input id="nc-code" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} style={{ width: 160, textTransform: 'uppercase' }} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="nc-pct">Discount %</label>
                  <input id="nc-pct" type="number" min={0} max={100} value={newCoupon.discount_percent} onChange={(e) => setNewCoupon({ ...newCoupon, discount_percent: e.target.value })} style={{ width: 110 }} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="nc-exp">Expires (optional)</label>
                  <input id="nc-exp" type="date" value={newCoupon.expires_at} onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })} style={{ width: 160 }} />
                </div>
                <button className="btn btn-grad btn-sm" disabled={busy === 'new-coupon'}>{busy === 'new-coupon' ? '…' : 'Create coupon'}</button>
              </form>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="tbl num" style={{ minWidth: 560 }}>
                  <thead><tr><th style={{ paddingLeft: 20 }}>Code</th><th>Discount</th><th>Expires</th><th>Active</th><th>Created</th><th style={{ paddingRight: 20 }}>Action</th></tr></thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td style={{ paddingLeft: 20, fontFamily: 'ui-monospace, monospace' }}>{c.code}</td>
                        <td>{c.discount_percent}%</td>
                        <td className="muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td><span className={'tag ' + (c.active ? 'tag-green' : 'tag-red')} style={{ fontSize: 10 }}>{c.active ? 'active' : 'inactive'}</span></td>
                        <td className="muted">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ paddingRight: 20 }}>
                          <button className="btn btn-line btn-sm" disabled={busy === c.id} onClick={() => toggleCoupon(c)}>{c.active ? 'Deactivate' : 'Activate'}</button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && <tr><td colSpan={6} className="muted" style={{ padding: 24, textAlign: 'center' }}>No coupons.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'Support' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tickets.length === 0 && <div className="card muted" style={{ textAlign: 'center', padding: 24 }}>No support tickets.</div>}
              {tickets.map((t) => {
                const expanded = openTicket === t.id;
                return (
                  <div className="card" key={t.id} style={{ padding: 0 }}>
                    <button onClick={() => toggleThread(t)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{t.profiles?.email || t.email} · {t.category || 'GENERAL'} · {new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                      </span>
                      <span className={'tag ' + (t.status === 'open' ? 'tag-gold' : 'tag-green')} style={{ fontSize: 10, flexShrink: 0 }}>{t.status}</span>
                    </button>
                    {expanded && (
                      <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
                        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          <AdminBubble role="trader" body={thread.message} />
                          {thread.loading && <span className="muted" style={{ fontSize: 12 }}>Loading thread…</span>}
                          {thread.missing && <span className="muted" style={{ fontSize: 12 }}>Threads not deployed — run <code>supabase/support.sql</code>.</span>}
                          {!thread.loading && !thread.missing && thread.msgs.map((m) => <AdminBubble key={m.id} role={m.author_role} body={m.body} />)}
                        </div>
                        {!thread.missing && (
                          <>
                            <textarea value={adminReply} onChange={(e) => setAdminReply(e.target.value)} rows={3} maxLength={5000}
                              placeholder="Reply as Support…"
                              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              <button className="btn btn-grad btn-sm" disabled={busy === 'reply-' + t.id || !adminReply.trim()} onClick={() => sendAdminReply(t)}>{busy === 'reply-' + t.id ? '…' : 'Send reply'}</button>
                              {t.status === 'open'
                                ? <button className="btn btn-green btn-sm" disabled={busy === t.id} onClick={() => ticketStatus(t, 'closed')}>Mark closed</button>
                                : <button className="btn btn-line btn-sm" disabled={busy === t.id} onClick={() => ticketStatus(t, 'open')}>Reopen</button>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="muted" style={{ fontSize: 11, margin: '4px 0 0' }}>
                Replies post into the trader&apos;s thread (no email). Statuses are <code>open</code> / <code>closed</code> only —
                priority, assignment and SLA are not modelled.
              </p>
            </div>
          )}
        </div>
      </section>

      {confirm && (
        <div onClick={() => !busy && setConfirm(null)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 8px', color: confirm.danger ? 'var(--red)' : 'var(--text)' }}>{confirm.title}?</h3>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 18px', lineHeight: 1.6 }}>{confirm.detail}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-line btn-sm" disabled={!!busy} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={'btn btn-sm ' + (confirm.danger ? 'btn-red' : 'btn-grad')} disabled={!!busy} onClick={confirm.run}>
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* Equity reconciliation diagnostic — recorded equity vs (capital + Σ realized
   trade P&L). accounts.equity is operations-maintained and may legitimately
   carry manual adjustments, so a MISMATCH is a review signal, never an
   auto-correct. UNAVAILABLE (missing capital/equity) is NOT a mismatch. */
function ReconChip({ recon }) {
  const map = {
    MATCHED: { tag: 'tag-green', label: 'equity reconciles' },
    MISMATCH: { tag: 'tag-gold', label: `Δ ${fmt(recon.equityDelta)} vs ledger` },
    UNAVAILABLE: { tag: 'tag-muted', label: 'reconciliation n/a' },
  };
  const m = map[recon.state] || map.UNAVAILABLE;
  const title = recon.state === 'MISMATCH'
    ? `Recorded equity ${fmt(recon.currentEquity)} vs capital + Σ trade P&L ${fmt(recon.impliedEquity)} (Σ realized ${fmt(recon.realizedTradePnl)}). Review — not auto-corrected.`
    : recon.state === 'MATCHED'
      ? `Recorded equity matches capital + Σ realized trade P&L (${fmt(recon.impliedEquity)}).`
      : 'Capital or equity missing — cannot reconcile.';
  return <span className={'tag ' + m.tag} title={title} style={{ fontSize: 9.5, marginTop: 4, display: 'inline-block' }}>{m.label}</span>;
}

function Kpi({ label, value, color }) {
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function AdminBubble({ role, body }) {
  const support = role === 'support';
  return (
    <div style={{
      alignSelf: support ? 'flex-end' : 'flex-start', maxWidth: '88%',
      background: support ? 'rgba(34,197,139,0.10)' : 'var(--bg2)',
      border: `1px solid ${support ? 'rgba(34,197,139,0.25)' : 'var(--line2)'}`,
      borderRadius: 10, padding: '9px 11px', fontSize: 12.5, lineHeight: 1.5,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.06em', color: support ? 'var(--green)' : 'var(--muted)', marginBottom: 3 }}>{support ? 'SUPPORT' : 'TRADER'}</div>
      {body}
    </div>
  );
}

function Badge({ s }) {
  const map = {
    approved: 'tag-green', paid: 'tag-green', active: 'tag-green', passed: 'tag-blue',
    rejected: 'tag-red', breached: 'tag-red',
    pending: 'tag-gold', requested: 'tag-gold', open: 'tag-gold',
  };
  return <span className={'tag ' + (map[s] || 'tag-blue')} style={{ fontSize: 10 }}>{s || '—'}</span>;
}
