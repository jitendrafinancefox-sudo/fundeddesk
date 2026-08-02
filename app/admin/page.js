'use client';
import { useEffect, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';
import ThemeToggle from '@/components/ThemeToggle';

const TABS = ['Orders', 'Accounts', 'Users', 'Payouts'];

export default function Admin() {
  const [tab, setTab] = useState('Orders');
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState('');
  const [tradeForm, setTradeForm] = useState({});

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (prof?.role !== 'admin') { window.location.href = '/dashboard'; return; }
    await loadAll();
    setReady(true);
  }

  async function loadAll() {
    const [o, a, u, p] = await Promise.all([
      supabase.from('orders').select('*, plans(*), profiles(email, full_name)').order('created_at', { ascending: false }),
      supabase.from('accounts').select('*, plans(*), profiles(email, full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('payouts').select('*, profiles(email), accounts(login_id)').order('created_at', { ascending: false }),
    ]);
    setOrders(o.data || []); setAccounts(a.data || []); setUsers(u.data || []); setPayouts(p.data || []);
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function approveOrder(o) {
    const loginId = 'FD-' + Math.floor(100000 + Math.random() * 900000);
    const { error: e1 } = await supabase.from('accounts').insert({
      user_id: o.user_id, plan_id: o.plan_id, login_id: loginId,
      equity: o.plans.capital, day_start_equity: o.plans.capital,
    });
    if (e1) return flash('Error: ' + e1.message);
    const { error: e2 } = await supabase.from('orders').update({ status: 'approved' }).eq('id', o.id);
    if (e2) return flash('Error: ' + e2.message);
    flash('Order approved — account ' + loginId + ' created for ' + (o.profiles?.email || 'user'));
    loadAll();
  }

  async function rejectOrder(o) {
    await supabase.from('orders').update({ status: 'rejected' }).eq('id', o.id);
    flash('Order rejected'); loadAll();
  }

  async function updateAccount(id, patch, note) {
    const { error } = await supabase.from('accounts').update(patch).eq('id', id);
    flash(error ? 'Error: ' + error.message : note);
    if (!error) loadAll();
  }

  async function addTrade(acc) {
    const f = tradeForm[acc.id] || {};
    const pnl = parseInt(f.pnl, 10);
    if (!f.instrument || !f.side || Number.isNaN(pnl)) return flash('Fill instrument, side and P&L (number, negative for loss).');
    const { error: e1 } = await supabase.from('trades').insert({ account_id: acc.id, instrument: f.instrument.toUpperCase(), side: f.side, pnl });
    if (e1) return flash('Error: ' + e1.message);
    const newEquity = acc.equity + pnl;
    const patch = { equity: newEquity };
    const cap = acc.plans.capital;
    if ((acc.day_start_equity - newEquity) / cap * 100 >= acc.plans.daily_loss || (cap - newEquity) / cap * 100 >= acc.plans.max_loss) {
      patch.status = 'breached';
    }
    await supabase.from('accounts').update(patch).eq('id', acc.id);
    setTradeForm({ ...tradeForm, [acc.id]: {} });
    flash('Trade added' + (patch.status === 'breached' ? ' — ACCOUNT AUTO-BREACHED (loss limit hit)' : ''));
    loadAll();
  }

  async function toggleRole(u) {
    const role = u.role === 'admin' ? 'trader' : 'admin';
    await supabase.from('profiles').update({ role }).eq('id', u.id);
    flash(u.email + ' is now ' + role); loadAll();
  }

  async function setPayout(p, status) {
    await supabase.from('payouts').update({ status }).eq('id', p.id);
    flash('Payout marked ' + status); loadAll();
  }

  if (!ready) return <div className="wrap" style={{ padding: '80px 0' }}><p className="muted">Checking admin access…</p></div>;

  const pending = orders.filter((o) => o.status === 'pending');

  return (
    <main>
      <section style={{ paddingTop: 44 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 28 }}>Admin Panel</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <span className="tag tag-gold">FULL ACCESS</span>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 24 }}>
            {users.length} users · {accounts.length} accounts · {pending.length} pending orders
          </p>
          {msg && <div className="ok">{msg}</div>}

          <div style={{ display: 'flex', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button key={t} className="btn btn-sm" onClick={() => setTab(t)}
                style={tab === t ? { background: 'var(--grad)', color: '#fff' } : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                {t}{t === 'Orders' && pending.length > 0 ? ` (${pending.length})` : ''}
              </button>
            ))}
          </div>

          {tab === 'Orders' && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="tbl num">
                <thead><tr><th style={{ paddingLeft: 22 }}>User</th><th>Plan</th><th>Type</th><th>Fee</th><th>UTR</th><th>Status</th><th>Date</th><th style={{ paddingRight: 22 }}>Action</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ paddingLeft: 22 }}>{o.profiles?.full_name}<div className="muted" style={{ fontSize: 12 }}>{o.profiles?.email}</div></td>
                      <td>{o.plans?.name}</td>
                      <td><span className="tag tag-blue">{o.eval_type === '1step' ? '1 Step' : '2 Step'}</span></td>
                      <td>{fmt(o.fee_amount ?? o.plans?.fee)}</td>
                      <td className="muted">{o.utr}</td>
                      <td><span className={'tag ' + (o.status === 'approved' ? 'tag-green' : o.status === 'rejected' ? 'tag-red' : 'tag-gold')}>{o.status}</span></td>
                      <td className="muted">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 22 }}>
                        {o.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-green btn-sm" onClick={() => approveOrder(o)}>Approve</button>
                            <button className="btn btn-red btn-sm" onClick={() => rejectOrder(o)}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 24, textAlign: 'center' }}>No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Accounts' && accounts.map((a) => {
            const f = tradeForm[a.id] || {};
            return (
              <div className="card" key={a.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 17 }}>{a.login_id}</h3>
                      <span className={'tag ' + (a.status === 'active' ? 'tag-green' : a.status === 'breached' ? 'tag-red' : 'tag-gold')}>{a.status}</span>
                      <span className="tag tag-blue">{a.phase}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{a.profiles?.email} · {a.plans?.name}</div>
                  </div>
                  <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 21 }}>{fmt(a.equity)}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <select value={a.phase} onChange={(e) => updateAccount(a.id, { phase: e.target.value }, 'Phase updated → ' + e.target.value)} style={{ width: 'auto' }}>
                    <option value="phase1">phase1</option><option value="phase2">phase2</option><option value="funded">funded</option>
                  </select>
                  <button className="btn btn-red btn-sm" onClick={() => updateAccount(a.id, { status: 'breached' }, a.login_id + ' marked BREACHED')}>Breach</button>
                  <button className="btn btn-green btn-sm" onClick={() => updateAccount(a.id, { status: 'active' }, a.login_id + ' re-activated')}>Activate</button>
                  <button className="btn btn-line btn-sm" onClick={() => updateAccount(a.id, { day_start_equity: a.equity }, 'Day-start equity reset for ' + a.login_id)}>Reset Day</button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input placeholder="Instrument (GOLD)" value={f.instrument || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, instrument: e.target.value } })} style={{ width: 150 }} />
                  <select value={f.side || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, side: e.target.value } })} style={{ width: 110 }}>
                    <option value="">Side</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
                  </select>
                  <input placeholder="P&L in ₹ (−ve for loss)" value={f.pnl || ''} onChange={(e) => setTradeForm({ ...tradeForm, [a.id]: { ...f, pnl: e.target.value } })} style={{ width: 180 }} />
                  <button className="btn btn-grad btn-sm" onClick={() => addTrade(a)}>Add Trade</button>
                </div>
              </div>
            );
          })}
          {tab === 'Accounts' && accounts.length === 0 && <div className="card muted" style={{ textAlign: 'center' }}>No accounts yet. Approve an order first.</div>}

          {tab === 'Users' && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="tbl">
                <thead><tr><th style={{ paddingLeft: 22 }}>Name</th><th>Email</th><th>Role</th><th>Joined</th><th style={{ paddingRight: 22 }}>Action</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ paddingLeft: 22 }}>{u.full_name || '—'}</td>
                      <td className="muted">{u.email}</td>
                      <td><span className={'tag ' + (u.role === 'admin' ? 'tag-gold' : 'tag-blue')}>{u.role}</span></td>
                      <td className="muted">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 22 }}>
                        <button className="btn btn-line btn-sm" onClick={() => toggleRole(u)}>
                          {u.role === 'admin' ? 'Make trader' : 'Make admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Payouts' && (
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table className="tbl num">
                <thead><tr><th style={{ paddingLeft: 22 }}>Account</th><th>User</th><th>Amount</th><th>Status</th><th>Date</th><th style={{ paddingRight: 22 }}>Action</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 22 }}>{p.accounts?.login_id}</td>
                      <td className="muted">{p.profiles?.email}</td>
                      <td className="green">{fmt(p.amount)}</td>
                      <td><span className={'tag ' + (p.status === 'paid' ? 'tag-green' : p.status === 'rejected' ? 'tag-red' : 'tag-gold')}>{p.status}</span></td>
                      <td className="muted">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ paddingRight: 22 }}>
                        {p.status === 'requested' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-green btn-sm" onClick={() => setPayout(p, 'paid')}>Mark Paid</button>
                            <button className="btn btn-red btn-sm" onClick={() => setPayout(p, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && <tr><td colSpan={6} className="muted" style={{ padding: 24, textAlign: 'center' }}>No payout requests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
