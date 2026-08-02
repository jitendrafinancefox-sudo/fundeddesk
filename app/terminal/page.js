'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase, fmt } from '@/lib/supabaseClient';
import { createChart } from 'lightweight-charts';
import ThemeToggle from '@/components/ThemeToggle';

export default function Terminal() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [acc, setAcc] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [inst, setInst] = useState(null);
  const [price, setPrice] = useState(0);
  const [positions, setPositions] = useState([]);
  const [lots, setLots] = useState('0.10');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const chartBox = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null);
  const posRef = useRef([]);
  const accRef = useRef(null);
  const closingRef = useRef(new Set());

  useEffect(() => { posRef.current = positions; }, [positions]);
  useEffect(() => { accRef.current = acc; }, [acc]);

  // ---------- initial load ----------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const uid = session.user.id;
      const [{ data: accs }, { data: insts }] = await Promise.all([
        supabase.from('accounts').select('*, plans(*)').eq('user_id', uid).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('instruments').select('*').eq('active', true).order('id'),
      ]);
      setAccounts(accs || []);
      if (accs?.length) setAcc(accs[0]);
      setInstruments(insts || []);
      if (insts?.length) setInst(insts[0]);
      setLoading(false);
    })();
  }, []);

  // ---------- load open positions for selected account ----------
  useEffect(() => {
    if (!acc) return;
    supabase.from('positions').select('*, instruments(*)')
      .eq('account_id', acc.id).eq('status', 'open')
      .order('opened_at', { ascending: false })
      .then(({ data }) => setPositions(data || []));
  }, [acc]);

  // ---------- chart + live feed per instrument ----------
  useEffect(() => {
    if (!inst || !chartBox.current) return;
    let dead = false;

    // build chart
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    const chart = createChart(chartBox.current, {
      height: 420,
      layout: { background: { color: 'transparent' }, textColor: '#98A2B8' },
      grid: { vertLines: { color: 'rgba(255,255,255,.05)' }, horzLines: { color: 'rgba(255,255,255,.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,.1)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,.1)' },
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#22C58B', downColor: '#F0525F',
      wickUpColor: '#22C58B', wickDownColor: '#F0525F',
      borderVisible: false,
    });
    chartRef.current = chart; seriesRef.current = series;

    const symbol = inst.feed_symbol.toUpperCase();

    // history
    fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=300`)
      .then((r) => r.json())
      .then((rows) => {
        if (dead || !Array.isArray(rows)) return;
        series.setData(rows.map((k) => ({
          time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4],
        })));
        setPrice(+rows[rows.length - 1][4]);
      })
      .catch(() => setErr('Price history could not be loaded. Check your internet connection.'));

    // live stream
    if (wsRef.current) { wsRef.current.close(); }
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${inst.feed_symbol.toLowerCase()}@kline_1m`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const k = JSON.parse(ev.data)?.k;
      if (!k) return;
      const p = +k.c;
      series.update({ time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: p });
      setPrice(p);
      checkSlTp(p);
    };

    const onResize = () => chart.applyOptions({ width: chartBox.current?.clientWidth || 600 });
    onResize();
    window.addEventListener('resize', onResize);

    return () => {
      dead = true;
      window.removeEventListener('resize', onResize);
      ws.close();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inst]);

  // ---------- SL/TP auto close ----------
  function checkSlTp(p) {
    posRef.current.forEach((pos) => {
      if (pos.instruments?.feed_symbol !== instRefSymbol()) return;
      if (closingRef.current.has(pos.id)) return;
      const hitSl = pos.sl && (pos.side === 'BUY' ? p <= +pos.sl : p >= +pos.sl);
      const hitTp = pos.tp && (pos.side === 'BUY' ? p >= +pos.tp : p <= +pos.tp);
      if (hitSl || hitTp) {
        closingRef.current.add(pos.id);
        closePos(pos, p, hitSl ? 'SL hit' : 'TP hit');
      }
    });
  }
  function instRefSymbol() { return inst?.feed_symbol; }

  // ---------- trading actions ----------
  async function openTrade(side) {
    setErr(''); setMsg('');
    if (!acc) return setErr('No active account. Buy a challenge first.');
    const l = parseFloat(lots);
    if (!l || l < inst.min_lot || l > inst.max_lot) return setErr(`Lots must be between ${inst.min_lot} and ${inst.max_lot}.`);
    if (!price) return setErr('Waiting for live price…');
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('positions').insert({
      account_id: acc.id, user_id: session.user.id, instrument_id: inst.id,
      side, lots: l, entry_price: price,
      sl: sl ? parseFloat(sl) : null, tp: tp ? parseFloat(tp) : null,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg(`${side} ${l} ${inst.symbol} @ ${price}`);
    const { data } = await supabase.from('positions').select('*, instruments(*)')
      .eq('account_id', acc.id).eq('status', 'open').order('opened_at', { ascending: false });
    setPositions(data || []);
  }

  async function closePos(pos, atPrice, reason) {
    const { data, error } = await supabase.rpc('close_position', {
      p_position_id: pos.id, p_exit_price: atPrice ?? price,
    });
    closingRef.current.delete(pos.id);
    if (error) return setErr(error.message);
    if (data?.error) return setErr(data.error);
    const pnlTxt = (data.pnl >= 0 ? '+' : '−') + fmt(Math.abs(data.pnl));
    if (data.breached) {
      setErr(`Position closed at ${pnlTxt}${reason ? ' (' + reason + ')' : ''} — LOSS LIMIT HIT. Account ${accRef.current?.login_id} has been BREACHED.`);
    } else {
      setMsg(`Position closed ${pnlTxt}${reason ? ' (' + reason + ')' : ''}. Equity: ${fmt(data.equity)}`);
    }
    // refresh account + positions
    const { data: accs } = await supabase.from('accounts').select('*, plans(*)')
      .eq('id', pos.account_id).single().then((r) => ({ data: r.data ? [r.data] : [] }));
    if (accs?.[0]) {
      if (accs[0].status !== 'active') {
        setAccounts((prev) => prev.filter((a) => a.id !== accs[0].id));
        setAcc((prev) => (prev?.id === accs[0].id ? null : prev));
        setPositions([]);
        return;
      }
      setAcc(accs[0]);
      setAccounts((prev) => prev.map((a) => (a.id === accs[0].id ? accs[0] : a)));
    }
    const { data: open } = await supabase.from('positions').select('*, instruments(*)')
      .eq('account_id', pos.account_id).eq('status', 'open').order('opened_at', { ascending: false });
    setPositions(open || []);
  }

  // ---------- computed ----------
  const floating = positions.reduce((sum, p) => {
    if (p.instruments?.feed_symbol !== inst?.feed_symbol) return sum; // live price only for current instrument
    const diff = p.side === 'BUY' ? price - p.entry_price : p.entry_price - price;
    return sum + diff * p.lots * (p.instruments?.contract_size || 1);
  }, 0);
  const liveEquity = (acc?.equity || 0) + floating;

  if (loading) return <div className="wrap" style={{ padding: '80px 0' }}><p className="muted">Loading terminal…</p></div>;

  if (!accounts.length) {
    return (
      <div className="wrap" style={{ padding: '80px 0', maxWidth: 640, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 10 }}>No active account</h2>
        <p className="muted" style={{ marginBottom: 22 }}>You need an active challenge account to use the terminal.</p>
        <a className="btn btn-grad" href="/challenges">Browse Challenges →</a>
      </div>
    );
  }

  return (
    <main>
      <section style={{ paddingTop: 34, paddingBottom: 40 }}>
        <div className="wrap">
          {/* top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={acc?.id || ''} onChange={(e) => setAcc(accounts.find((a) => a.id === e.target.value))} style={{ width: 'auto' }}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.login_id} · {a.plans.name}</option>)}
              </select>
              <select value={inst?.id || ''} onChange={(e) => setInst(instruments.find((i) => i.id === +e.target.value))} style={{ width: 'auto' }}>
                {instruments.map((i) => <option key={i.id} value={i.id}>{i.display_name} ({i.symbol})</option>)}
              </select>
            </div>
            <div className="num" style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
              <ThemeToggle style={{ width: 30, height: 30 }} />
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Live price</div>
                <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20 }}>{price ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Equity (live)</div>
                <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: floating >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(Math.round(liveEquity))}</div>
              </div>
            </div>
          </div>

          {err && <div className="err">{err}</div>}
          {msg && <div className="ok">{msg}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }} className="term-grid">
            {/* chart */}
            <div className="card" style={{ padding: 12 }}>
              <div ref={chartBox} style={{ width: '100%' }} />
              <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>
                Simulated environment · live market data feed · orders are not placed on any exchange.
              </p>
            </div>

            {/* order panel */}
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 14 }}>New Order — {inst?.symbol}</h3>
              <div className="field"><label>Lots ({inst?.min_lot}–{inst?.max_lot})</label>
                <input value={lots} onChange={(e) => setLots(e.target.value)} /></div>
              <div className="field"><label>Stop Loss (price, optional)</label>
                <input value={sl} onChange={(e) => setSl(e.target.value)} placeholder="e.g. lower than price for BUY" /></div>
              <div className="field"><label>Take Profit (price, optional)</label>
                <input value={tp} onChange={(e) => setTp(e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn btn-green" disabled={busy} onClick={() => openTrade('BUY')}>BUY ▲</button>
                <button className="btn btn-red" disabled={busy} onClick={() => openTrade('SELL')}>SELL ▼</button>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 12 }}>
                1.0 lot = ₹{inst?.contract_size} per point move. P&amp;L settles in ₹ on your simulated account.
              </p>
            </div>
          </div>

          {/* open positions */}
          <div className="card" style={{ marginTop: 18, padding: 0, overflow: 'auto' }}>
            <h3 style={{ fontSize: 15, padding: '16px 20px 0' }}>Open Positions ({positions.length})</h3>
            <table className="tbl num">
              <thead><tr>
                <th style={{ paddingLeft: 20 }}>Symbol</th><th>Side</th><th>Lots</th><th>Entry</th>
                <th>SL</th><th>TP</th><th>Floating P&amp;L</th><th style={{ paddingRight: 20 }}>Action</th>
              </tr></thead>
              <tbody>
                {positions.map((p) => {
                  const same = p.instruments?.feed_symbol === inst?.feed_symbol;
                  const diff = p.side === 'BUY' ? price - p.entry_price : p.entry_price - price;
                  const fl = same ? Math.round(diff * p.lots * (p.instruments?.contract_size || 1)) : null;
                  return (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 20 }}>{p.instruments?.symbol}</td>
                      <td><span className={'tag ' + (p.side === 'BUY' ? 'tag-green' : 'tag-red')}>{p.side}</span></td>
                      <td>{p.lots}</td>
                      <td>{(+p.entry_price).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                      <td className="muted">{p.sl || '—'}</td>
                      <td className="muted">{p.tp || '—'}</td>
                      <td className={fl == null ? 'muted' : fl >= 0 ? 'green' : 'red'}>
                        {fl == null ? 'switch chart' : (fl >= 0 ? '+' : '−') + fmt(Math.abs(fl))}
                      </td>
                      <td style={{ paddingRight: 20 }}>
                        <button className="btn btn-line btn-sm" disabled={!same} onClick={() => closePos(p)}>Close</button>
                      </td>
                    </tr>
                  );
                })}
                {positions.length === 0 && <tr><td colSpan={8} className="muted" style={{ padding: 22, textAlign: 'center' }}>No open positions. Place your first order above.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <style jsx global>{`
        @media (max-width: 900px) { .term-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </main>
  );
}
