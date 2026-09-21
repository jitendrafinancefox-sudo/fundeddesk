'use client';

/* ============================================================
   /portal/leaderboard  —  Funded-account performance board

   Every value comes from the `get_leaderboard()` SECURITY DEFINER RPC
   (supabase/leaderboard.sql). That function is the ONLY data source —
   this page never queries accounts/trades/profiles directly (RLS would
   only return the caller's own rows anyway) and never fabricates a
   trader, name, amount, rank or percentage.

   Ranking is ACCOUNT-LEVEL (one row per eligible account). A trader with
   several funded accounts appears once per account under the same
   anonymised "Trader ####" tag. Eligibility = phase funded + status
   active. Metric = all-time return on account size.
   ============================================================ */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatINR } from '@/lib/format';
import { getPlanTypeLabel } from '@/lib/accounts';

function pctStr(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function pnlStr(v) {
  return formatINR(v, { sign: true });
}
function pnlColor(v) {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return 'var(--text)';
  return Number(v) >= 0 ? 'var(--green)' : 'var(--red)';
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { kind: 'not-deployed' | 'error', message? }

  useEffect(() => {
    let on = true;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_leaderboard');
      if (!on) return;
      if (rpcError) {
        const msg = rpcError.message || '';
        const missing = rpcError.code === '42883' || /does not exist|could not find|not found|schema cache/i.test(msg);
        setError(missing ? { kind: 'not-deployed' } : { kind: 'error', message: msg });
        setRows([]);
      } else {
        setRows(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  const podium = rows.slice(0, 3);
  const youRanked = rows.some((r) => r.is_you);

  return (
    <div className="portal-dashboard">
      {/* header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Leaderboard</h1>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 0', maxWidth: 620, lineHeight: 1.6 }}>
          Funded accounts ranked by all-time return on account size —
          <span style={{ whiteSpace: 'nowrap' }}> (equity − capital) ÷ capital</span>. Traders are shown anonymously.
          Only <b style={{ color: 'var(--text)' }}>funded · active</b> accounts are ranked.
        </p>
      </div>

      {loading && <LoadingState />}

      {!loading && error?.kind === 'not-deployed' && (
        <div className="card" style={{ padding: '30px 22px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">🏗️</div>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Leaderboard aggregation not deployed</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            The <code>get_leaderboard()</code> database function is not present on this environment. Run
            <code> supabase/leaderboard.sql</code> in the Supabase SQL editor to enable the board. No placeholder
            data is shown.
          </p>
        </div>
      )}

      {!loading && error?.kind === 'error' && (
        <div className="err" style={{ maxWidth: 620 }}>Could not load the leaderboard: {error.message}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="card" style={{ padding: '34px 22px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">📊</div>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Leaderboard is not available yet</h2>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 16px' }}>
            No funded, active accounts are ranked right now. The board fills in as traders reach the funded stage.
          </p>
          <Link href="/portal/accounts" className="btn btn-grad btn-sm">View Accounts</Link>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* podium — only real positions */}
          {podium.length > 0 && (
            <div
              className="lb-podium"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${podium.length}, minmax(0, 1fr))`, gap: 12, marginBottom: 18, maxWidth: podium.length < 3 ? 520 : undefined }}
            >
              {(podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i)).map((i) => {
                const r = podium[i];
                if (!r) return null;
                return (
                  <div
                    key={r.rank}
                    className="card"
                    style={{
                      textAlign: 'center', padding: '20px 16px', position: 'relative',
                      border: i === 0 ? '1px solid rgba(245,185,62,.4)' : undefined,
                      background: i === 0 ? 'linear-gradient(180deg,rgba(245,185,62,.07),var(--card))' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }} aria-hidden="true">{MEDAL[i] || ''}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--muted)' }}>#{r.rank}</div>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'var(--card2, #141A2B)',
                      display: 'grid', placeItems: 'center', margin: '8px auto 6px', fontWeight: 800, color: 'var(--green)', fontSize: 14,
                    }} aria-hidden="true">{(r.trader || 'T')[0]}</div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 14 }}>
                      {r.trader}{r.is_you && <span className="tag tag-green" style={{ fontSize: 9, marginLeft: 6 }}>YOU</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
                      {getPlanTypeLabel(r.plan_type)} · {formatINR(r.capital)}
                    </div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontWeight: 800, fontSize: 18, color: pnlColor(r.return_pct) }}>
                      {pctStr(r.return_pct)}
                    </div>
                    <div className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{pnlStr(r.net_pnl)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* full table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Rankings</h2>
              <span className="muted" style={{ fontSize: 11 }}>All-time · {rows.length} account{rows.length === 1 ? '' : 's'}</span>
            </div>

            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Trader</th>
                    <th scope="col">Account</th>
                    <th scope="col">Plan</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Return</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Net P&amp;L</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Account Size</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.rank}-${r.account_tag}`} className={r.is_you ? 'is-you' : undefined}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>#{r.rank}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'Manrope,sans-serif' }}>
                        {r.trader}
                        {r.is_you && <span className="tag tag-green" style={{ fontSize: 9, marginLeft: 6 }}>YOU</span>}
                      </td>
                      <td className="muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.account_tag}</td>
                      <td className="muted">{getPlanTypeLabel(r.plan_type)}{r.plan_name ? ` · ${r.plan_name}` : ''}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: pnlColor(r.return_pct) }}>{pctStr(r.return_pct)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: pnlColor(r.net_pnl) }}>{pnlStr(r.net_pnl)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatINR(r.capital)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="leaderboard-cards" style={{ gap: 0, gridTemplateColumns: '1fr' }}>
              {rows.map((r) => (
                <div
                  key={`c-${r.rank}-${r.account_tag}`}
                  style={{ padding: '13px 16px', borderBottom: '1px solid rgba(34,197,139,0.06)', background: r.is_you ? 'rgba(34,197,139,0.07)' : undefined }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontFamily: 'Manrope,sans-serif', fontSize: 14 }}>
                      <span className="muted" style={{ fontWeight: 500 }}>#{r.rank} · </span>{r.trader}
                      {r.is_you && <span className="tag tag-green" style={{ fontSize: 9, marginLeft: 6 }}>YOU</span>}
                    </div>
                    <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: pnlColor(r.return_pct) }}>{pctStr(r.return_pct)}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                    <span className="muted">{getPlanTypeLabel(r.plan_type)} · {r.account_tag}</span>
                    <span style={{ color: pnlColor(r.net_pnl), fontVariantNumeric: 'tabular-nums' }}>{pnlStr(r.net_pnl)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Account size {formatINR(r.capital)}</div>
                </div>
              ))}
            </div>
          </div>

          {!youRanked && (
            <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
              Your account is not currently ranked — only funded, active accounts appear here.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ height: 150, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <div className="card" style={{ padding: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    </>
  );
}
