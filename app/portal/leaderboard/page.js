'use client';
import { useEffect, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.rpc('leaderboard').then(({ data, error }) => {
      if (error) setErr(error.message + ' — portal-schema.sql Supabase mein run kiya?');
      setRows(data || []);
      setLoading(false);
    });
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 18 }}>Leaderboard</h2>
      {err && <div className="err">{err}</div>}
      {loading && <p className="muted">Loading…</p>}

      {top3.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
          {[1, 0, 2].filter((i) => top3[i]).map((i) => {
            const r = top3[i];
            return (
              <div className="card" key={i} style={{
                textAlign: 'center', padding: '26px 18px',
                transform: i === 0 ? 'scale(1.04)' : 'none',
                borderColor: i === 0 ? 'rgba(245,185,62,.45)' : undefined,
                background: i === 0 ? 'linear-gradient(180deg,rgba(245,185,62,.08),var(--card))' : undefined,
              }}>
                <div style={{ fontSize: 34, marginBottom: 6 }}>{MEDAL[i]}</div>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--card2)', display: 'grid', placeItems: 'center', margin: '0 auto 8px', fontWeight: 800, color: 'var(--green)' }}>
                  {r.display_name[0]}
                </div>
                <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 16 }}>{r.display_name}</div>
                <div className="dim" style={{ fontSize: 11.5, marginBottom: 10 }}>{fmt(r.capital)} account</div>
                <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: r.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {r.profit >= 0 ? '+' : '−'}{fmt(Math.abs(r.profit))}
                </div>
                <div className="dim" style={{ fontSize: 11.5 }}>{r.profit_pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <h3 style={{ fontSize: 15, padding: '16px 20px 0' }}>Best Accounts in Profit</h3>
          <table className="tbl num">
            <thead><tr><th style={{ paddingLeft: 20 }}>Rank</th><th>User</th><th>Account size</th><th>Profit</th><th style={{ paddingRight: 20 }}>Profit %</th></tr></thead>
            <tbody>
              {rest.map((r, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 20 }}><span className="tag tag-blue">{i + 4}</span></td>
                  <td><b>{r.display_name}</b></td>
                  <td>{fmt(r.capital)}</td>
                  <td className={r.profit >= 0 ? 'green' : 'red'}><b>{r.profit >= 0 ? '+' : '−'}{fmt(Math.abs(r.profit))}</b></td>
                  <td style={{ paddingRight: 20 }} className={r.profit >= 0 ? 'green' : 'red'}>{r.profit_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && rows.length === 0 && !err && <div className="card muted" style={{ textAlign: 'center' }}>No accounts yet — leaderboard fills up as traders join.</div>}
    </div>
  );
}
