'use client';
import { useEffect, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';

export default function PayoutsPage() {
  const [accounts, setAccounts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [sel, setSel] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const [{ data: accs }, { data: pays }] = await Promise.all([
      supabase.from('accounts').select('*, plans(*)').eq('user_id', session.user.id).eq('status', 'active').eq('phase', 'funded'),
      supabase.from('payouts').select('*, accounts(login_id)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ]);
    setAccounts(accs || []);
    if (accs?.length && !sel) setSel(accs[0].id);
    setPayouts(pays || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function request() {
    setErr(''); setMsg('');
    const acc = accounts.find((a) => a.id === sel);
    if (!acc) return setErr('Payout ke liye ek active FUNDED account chahiye. Pehle evaluation pass karo.');
    const profit = acc.equity - acc.plans.capital;
    if (profit <= 0) return setErr('Is account par abhi koi profit nahi hai.');
    const amount = Math.round(profit * acc.plans.split / 100);
    const { error } = await supabase.from('payouts').insert({ account_id: acc.id, user_id: acc.user_id, amount });
    if (error) return setErr(error.message);
    setMsg('Payout request submitted: ' + fmt(amount) + ' (' + acc.plans.split + '% split). Processing within 24h.');
    load();
  }

  const tag = (s) => 'tag ' + (s === 'paid' ? 'tag-green' : s === 'rejected' ? 'tag-red' : 'tag-gold');

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 18 }}>Payouts</h2>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18, background: 'linear-gradient(120deg,rgba(34,197,139,.12),var(--card))', borderColor: 'rgba(34,197,139,.3)' }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>💸 Ready to request your payout?</h3>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 520 }}>
            Funded account select karo aur Request dabao — profit ka tumhara split turant request ho jayega. Processing within 24 hours.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {accounts.length > 0 && (
            <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: 'auto' }}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.login_id} · {fmt(a.equity)}</option>)}
            </select>
          )}
          <button className="btn btn-grad btn-sm" onClick={request}>🏦 Request Payout</button>
        </div>
      </div>

      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, padding: '16px 20px 0' }}>Payout History</h3>
        {loading ? <p className="muted" style={{ padding: 20 }}>Loading…</p> : payouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '34px 0 40px' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🗂️</div>
            <p className="muted">Data is not found</p>
          </div>
        ) : (
          <table className="tbl num">
            <thead><tr><th style={{ paddingLeft: 20 }}>Sr.</th><th>Account</th><th>Amount</th><th>Status</th><th style={{ paddingRight: 20 }}>Requested on</th></tr></thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 20 }} className="muted">{i + 1}</td>
                  <td>{p.accounts?.login_id}</td>
                  <td className="green"><b>{fmt(p.amount)}</b></td>
                  <td><span className={tag(p.status)}>{p.status.toUpperCase()}</span></td>
                  <td style={{ paddingRight: 20 }} className="muted">{new Date(p.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
