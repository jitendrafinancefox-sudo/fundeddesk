'use client';
/* Portal Home — account overview dashboard (stats + equity curve) */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createChart, AreaSeries } from 'lightweight-charts';
import { supabase, fmt } from '@/lib/supabaseClient';
import { PartyPopper, LineChart, ScrollText, Wallet, ArrowRight } from 'lucide-react';

export default function PortalHome() {
  const [accounts, setAccounts] = useState([]);
  const [acc, setAcc] = useState(null);
  const [trades, setTrades] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartBox = useRef(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [{ data: prof }, { data: accs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('accounts').select('*, plans(*)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ]);
      setProfile(prof);
      setAccounts(accs || []);
      if (accs?.length) setAcc(accs[0]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!acc) { setTrades([]); return; }
    supabase.from('trades').select('*').eq('account_id', acc.id).order('traded_at', { ascending: true })
      .then(({ data }) => setTrades(data || []));
  }, [acc]);

  // equity curve
  useEffect(() => {
    if (!chartBox.current || !acc) return;
    const chart = createChart(chartBox.current, {
      height: 250, autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#98A2B8' },
      grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.04)' } },
      timeScale: { timeVisible: true, borderColor: 'rgba(255,255,255,.1)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,.1)' },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#22C58B', topColor: 'rgba(34,197,139,.25)', bottomColor: 'rgba(34,197,139,0)', lineWidth: 2,
    });
    let eq = acc.plans.capital;
    const pts = [{ time: Math.floor(new Date(acc.created_at).getTime() / 1000), value: eq }];
    trades.forEach((t) => {
      eq += t.pnl;
      pts.push({ time: Math.floor(new Date(t.traded_at).getTime() / 1000), value: eq });
    });
    // dedupe same-second times
    const seen = new Set(); const clean = [];
    pts.forEach((p) => { let t = p.time; while (seen.has(t)) t += 1; seen.add(t); clean.push({ time: t, value: p.value }); });
    series.setData(clean);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [acc, trades]);

  if (loading) return <p className="muted">Loading…</p>;

  if (!accounts.length) return (
    <div>
      <div className="card" style={{
        textAlign: 'center', padding: '52px 30px', marginBottom: 20,
        background: 'linear-gradient(160deg,rgba(77,124,254,.10),var(--card))', borderColor: 'rgba(77,124,254,.3)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, background: 'var(--grad)', margin: '0 auto 18px',
          display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px rgba(77,124,254,.35)',
        }}><PartyPopper size={26} color="#fff" /></div>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Welcome{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!</h2>
        <p className="muted" style={{ maxWidth: 420, margin: '0 auto 24px', fontSize: 14.5 }}>
          You don&apos;t have a challenge account yet. Buy a challenge, get verified, and your live dashboard —
          equity curve, win ratio, risk meter — comes alive right here.
        </p>
        <Link className="btn btn-grad" href="/challenges">Browse Challenges →</Link>
      </div>

      <div className="grid3">
        {[
          [LineChart, 'Live Terminal', 'Trade real NIFTY & BANKNIFTY option chains the moment your account is approved.'],
          [ScrollText, 'Transparent Rules', 'Every breach condition public — see exactly what keeps your account safe.'],
          [Wallet, '24h Payouts', 'Once funded, request your reward split any time — processed within a day.'],
        ].map(([Icon, t, d]) => (
          <div className="card" key={t} style={{ padding: 22, transition: 'transform .2s,border-color .2s' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, background: 'rgba(77,124,254,.13)',
              display: 'grid', placeItems: 'center', marginBottom: 14,
            }}><Icon size={19} color="var(--blue)" /></div>
            <h3 style={{ fontSize: 15.5, marginBottom: 6 }}>{t}</h3>
            <p className="muted" style={{ fontSize: 13 }}>{d}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const cap = acc.plans.capital;
  const profit = acc.equity - cap;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRatio = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? grossW / wins.length : 0;
  const avgLoss = losses.length ? grossL / losses.length : 0;
  const pf = grossL > 0 ? grossW / grossL : grossW > 0 ? 99 : 0;
  const days = new Set(trades.map((t) => new Date(t.traded_at).toDateString())).size;
  const phaseTag = { phase1: 'PHASE 1', phase2: 'PHASE 2', funded: 'FUNDED' }[acc.phase] || acc.phase;

  const stat = (k, v, color) => (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: 150 }}>
      <div className="dim" style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase' }}>{k}</div>
      <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 21, color, marginTop: 4 }}>{v}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <h2 style={{ fontSize: 22 }}>Account Overview</h2>
        <select value={acc.id} onChange={(e) => setAcc(accounts.find((a) => a.id === e.target.value))} style={{ width: 'auto' }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.login_id} · {a.plans.name} · {a.status}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }} className="dash-grid">
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {stat('Account Balance', fmt(acc.equity))}
            {stat('Equity', fmt(acc.equity))}
            {stat('Profit', (profit >= 0 ? '+' : '−') + fmt(Math.abs(profit)), profit >= 0 ? 'var(--green)' : 'var(--red)')}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {stat('Average Win', fmt(Math.round(avgWin)), 'var(--green)')}
            {stat('Average Loss', fmt(Math.round(avgLoss)), 'var(--red)')}
            {stat('Win Ratio', winRatio.toFixed(1) + '%')}
            {stat('Profit Factor', pf ? pf.toFixed(2) : '0')}
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>EQUITY CURVE</div>
            <div ref={chartBox} style={{ width: '100%' }} />
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--grad)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', fontSize: 22 }}>◆</div>
            <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 17 }}>{acc.login_id}</div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{acc.plans.name}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
              <span className="tag tag-blue">{phaseTag}</span>
              <span className={'tag ' + (acc.status === 'active' ? 'tag-green' : acc.status === 'breached' ? 'tag-red' : 'tag-gold')}>{acc.status.toUpperCase()}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 8px' }}>
                <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800 }}>{trades.length}</div>
                <div className="dim" style={{ fontSize: 10.5 }}>No. of trades</div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 8px' }}>
                <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800 }}>{days}</div>
                <div className="dim" style={{ fontSize: 10.5 }}>Days traded</div>
              </div>
            </div>
            <div className="dim" style={{ fontSize: 11, marginBottom: 4 }}>Created at</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>{new Date(acc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            <Link className="btn btn-grad btn-sm" style={{ width: '100%' }} href="/portal/terminal">Open Terminal →</Link>
          </div>

          <div className="card">
            <div className="dim" style={{ fontSize: 11, marginBottom: 10 }}>RISK METER (loss limit used)</div>
            {(() => {
              const used = Math.max(0, ((cap - acc.equity) / cap) * 100);
              const p = Math.min(100, (used / acc.plans.max_loss) * 100);
              return (
                <>
                  <div className="bar" style={{ height: 10 }}>
                    <i className={p > 70 ? 'r' : 'g'} style={{ width: p + '%' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 6 }}>
                    <span className="muted">{used.toFixed(1)}% used</span>
                    <span className="dim">limit {acc.plans.max_loss}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:900px){.dash-grid{grid-template-columns:1fr!important}}` }} />
    </div>
  );
}
