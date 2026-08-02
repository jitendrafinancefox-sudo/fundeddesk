'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, fmt } from '@/lib/supabaseClient';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState({});
  const [payouts, setPayouts] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/login'; return; }
    const uid = session.user.id;
    const [{ data: prof }, { data: accs }, { data: ords }, { data: pays }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('accounts').select('*, plans(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('orders').select('*, plans(name, fee)').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('payouts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);
    setProfile(prof); setAccounts(accs || []); setOrders(ords || []); setPayouts(pays || []);
    if (accs?.length) {
      const { data: trs } = await supabase.from('trades')
        .select('*').in('account_id', accs.map((a) => a.id))
        .order('traded_at', { ascending: false }).limit(40);
      const byAcc = {};
      (trs || []).forEach((t) => { (byAcc[t.account_id] = byAcc[t.account_id] || []).push(t); });
      setTrades(byAcc);
    }
    setLoading(false);
  }

  async function requestPayout(acc) {
    const profit = acc.equity - acc.plans.capital;
    if (profit <= 0) return setMsg('No profit available to withdraw on ' + acc.login_id + '.');
    const amount = Math.round(profit * acc.plans.split / 100);
    const { error } = await supabase.from('payouts').insert({ account_id: acc.id, user_id: acc.user_id, amount });
    setMsg(error ? error.message : 'Payout of ' + fmt(amount) + ' requested for ' + acc.login_id + '. Processing within 24h.');
    if (!error) load();
  }

  if (loading) return <div className="wrap" style={{ padding: '80px 0' }}><p className="muted">Loading dashboard…</p></div>;

  const phaseTag = { phase1: ['tag-blue', 'PHASE 1'], phase2: ['tag-grey', 'PHASE 2'], funded: ['tag-green', 'FUNDED'] };
  const statusTag = { active: ['tag-green', 'ACTIVE'], breached: ['tag-red', 'BREACHED'], passed: ['tag-gold', 'PASSED'] };

  return (
    <main>
      <section style={{ paddingTop: 48 }}>
        <div className="wrap">
          <h2 style={{ fontSize: 28, marginBottom: 4 }}>Welcome, {profile?.full_name || 'Trader'}</h2>
          <p className="muted" style={{ marginBottom: 30 }}>Your accounts, orders and payouts — all in one place.</p>
          {msg && <div className="ok">{msg}</div>}

          {accounts.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 46, marginBottom: 24 }}>
              <h3 style={{ marginBottom: 8 }}>No challenge accounts yet</h3>
              <p className="muted" style={{ marginBottom: 20 }}>Start a challenge and your account appears here after payment verification.</p>
              <Link className="btn btn-grad" href="/challenges">Browse Challenges →</Link>
            </div>
          )}

          {accounts.map((acc) => {
            const cap = acc.plans.capital;
            const profitPct = ((acc.equity - cap) / cap) * 100;
            const target = acc.phase === 'phase1' ? acc.plans.target_p1 : acc.phase === 'phase2' ? acc.plans.target_p2 : null;
            const dailyUsed = Math.max(0, ((acc.day_start_equity - acc.equity) / cap) * 100);
            const maxUsed = Math.max(0, ((cap - acc.equity) / cap) * 100);
            const [pC, pT] = phaseTag[acc.phase] || ['tag-grey', acc.phase];
            const [sC, sT] = statusTag[acc.status] || ['tag-grey', acc.status];
            return (
              <div className="card" key={acc.id} style={{ marginBottom: 22, borderColor: acc.status === 'breached' ? 'rgba(240,82,95,.4)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18 }}>{acc.login_id}</h3>
                      <span className={'tag ' + pC}>{pT}</span>
                      <span className={'tag ' + sC}>{sT}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>{acc.plans.name} · started {new Date(acc.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="num" style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 24 }}>{fmt(acc.equity)}</div>
                    <div style={{ fontSize: 13, color: profitPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {profitPct >= 0 ? '▲ +' : '▼ '}{profitPct.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid3 num" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginBottom: 7 }}>
                      <span>Profit target</span>
                      <span style={{ color: 'var(--green)' }}>{target ? `${Math.max(0, profitPct).toFixed(1)}% / ${target}%` : '— funded'}</span>
                    </div>
                    <div className="bar"><i style={{ width: target ? Math.min(100, Math.max(0, profitPct / target * 100)) + '%' : '100%' }} /></div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginBottom: 7 }}>
                      <span>Daily loss used</span><span>{dailyUsed.toFixed(1)}% / {acc.plans.daily_loss}%</span>
                    </div>
                    <div className="bar"><i className={dailyUsed / acc.plans.daily_loss > 0.7 ? 'r' : 'g'} style={{ width: Math.min(100, dailyUsed / acc.plans.daily_loss * 100) + '%' }} /></div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginBottom: 7 }}>
                      <span>Max loss used</span><span>{maxUsed.toFixed(1)}% / {acc.plans.max_loss}%</span>
                    </div>
                    <div className="bar"><i className={maxUsed / acc.plans.max_loss > 0.7 ? 'r' : 'g'} style={{ width: Math.min(100, maxUsed / acc.plans.max_loss * 100) + '%' }} /></div>
                  </div>
                </div>

                {(trades[acc.id] || []).length > 0 && (
                  <table className="tbl num" style={{ marginTop: 14 }}>
                    <thead><tr><th>Instrument</th><th>Side</th><th>P&amp;L</th><th>Time</th></tr></thead>
                    <tbody>
                      {trades[acc.id].slice(0, 5).map((t) => (
                        <tr key={t.id}>
                          <td>{t.instrument}</td>
                          <td><span className={'tag ' + (t.side === 'BUY' ? 'tag-green' : 'tag-red')}>{t.side}</span></td>
                          <td className={t.pnl >= 0 ? 'green' : 'red'}>{t.pnl >= 0 ? '+' : '−'}{fmt(Math.abs(t.pnl))}</td>
                          <td className="muted">{new Date(t.traded_at).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {acc.phase === 'funded' && acc.status === 'active' && (
                  <button className="btn btn-grad btn-sm" style={{ marginTop: 16 }} onClick={() => requestPayout(acc)}>
                    Request Payout ({acc.plans.split}% split)
                  </button>
                )}
              </div>
            );
          })}

          {orders.length > 0 && (
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Orders</h3>
              <table className="tbl num">
                <thead><tr><th>Plan</th><th>Fee</th><th>UTR</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.plans?.name}</td>
                      <td>{fmt(o.plans?.fee)}</td>
                      <td className="muted">{o.utr}</td>
                      <td><span className={'tag ' + (o.status === 'approved' ? 'tag-green' : o.status === 'rejected' ? 'tag-red' : 'tag-gold')}>{o.status}</span></td>
                      <td className="muted">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {payouts.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Payouts</h3>
              <table className="tbl num">
                <thead><tr><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="green">{fmt(p.amount)}</td>
                      <td><span className={'tag ' + (p.status === 'paid' ? 'tag-green' : p.status === 'rejected' ? 'tag-red' : 'tag-gold')}>{p.status}</span></td>
                      <td className="muted">{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
