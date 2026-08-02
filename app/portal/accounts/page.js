'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, fmt } from '@/lib/supabaseClient';

const FILTERS = [['all', 'All'], ['active', 'Active'], ['breached', 'Not Passed'], ['passed', 'Passed']];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [f, setF] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('accounts').select('*, plans(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setAccounts(data || []);
      setLoading(false);
    })();
  }, []);

  const list = accounts.filter((a) => f === 'all' || a.status === f);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <h2 style={{ fontSize: 22 }}>Challenge Accounts</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(([k, label]) => (
            <button key={k} className="btn btn-sm" onClick={() => setF(k)}
              style={f === k ? { background: 'var(--grad)', color: '#fff' } : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && list.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 44 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗂️</div>
          <h3 style={{ marginBottom: 8 }}>Accounts not found</h3>
          <p className="muted" style={{ marginBottom: 18 }}>{f === 'all' ? 'Start a challenge to get your first account.' : 'No accounts in this filter.'}</p>
          <Link className="btn btn-grad btn-sm" href="/challenges">+ New Challenge</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {list.map((a) => {
          const profit = a.equity - a.plans.capital;
          return (
            <div className="card" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <b style={{ fontFamily: 'Manrope', fontSize: 16 }}>{a.login_id}</b>
                <span className={'tag ' + (a.status === 'active' ? 'tag-green' : a.status === 'breached' ? 'tag-red' : 'tag-gold')}>{a.status.toUpperCase()}</span>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>{a.plans.name} · <span className="tag tag-blue" style={{ fontSize: 9.5 }}>{a.phase.toUpperCase()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '7px 0', borderBottom: '1px dashed var(--line)' }}>
                <span className="muted">Equity</span><b className="num">{fmt(a.equity)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '7px 0', borderBottom: '1px dashed var(--line)' }}>
                <span className="muted">Profit</span>
                <b className={'num ' + (profit >= 0 ? 'green' : 'red')}>{profit >= 0 ? '+' : '−'}{fmt(Math.abs(profit))}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '7px 0', marginBottom: 12 }}>
                <span className="muted">Created</span><span>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-line btn-sm" style={{ flex: 1 }} href="/portal">Dashboard</Link>
                {a.status === 'active' && <Link className="btn btn-grad btn-sm" style={{ flex: 1 }} href="/portal/terminal">Trade</Link>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
