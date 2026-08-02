'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ChartCanvas from '@/components/chart/ChartCanvas';
import TerminalLayout from '@/components/terminal/TerminalLayout';
import TopToolbar from '@/components/terminal/TopToolbar';
import LeftToolbar from '@/components/terminal/LeftToolbar';
import IndicatorMenu from '@/components/terminal/IndicatorMenu';
import RightSidebar from '@/components/terminal/RightSidebar';
import BottomPanel from '@/components/terminal/BottomPanel';
import Watchlist from '@/components/terminal/Watchlist';
import OrderPanel from '@/components/terminal/OrderPanel';
import PositionPanel from '@/components/terminal/PositionPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useOrders } from '@/hooks/useOrders';
import { setTradingState } from '@/stores/tradingStore';

const INDEX_TOKEN = { NIFTY: '99926000', BANKNIFTY: '99926009' };
const TIMEFRAMES = [['1m', 'ONE_MINUTE'], ['5m', 'FIVE_MINUTE'], ['15m', 'FIFTEEN_MINUTE'], ['1h', 'ONE_HOUR'], ['1D', 'ONE_DAY']];
const CAPITAL = 1000000;
const DAILY_LOSS = 50000;
const MAX_LOSS = 100000;
const inr = (value) => '₹' + Math.abs(Math.round(value || 0)).toLocaleString('en-IN');
// Stable reference — an inline arrow here would be a NEW function every
// render, and ChartCanvas's history-fetch effect depends on it, so a fresh
// reference every ~1.5s (chain poll) was re-triggering a full history
// refetch + full redraw on a loop: the flicker, and the zoom/pan getting
// fought over mid-gesture.
const noop = () => {};

export default function TradingTerminal() {
  const rootRef = useRef(null);
  const [underlying, setUnderlying] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[2]);
  const [selection, setSelection] = useState(null);
  const [chartMode, setChartMode] = useState('index');
  const [tool, setTool] = useState('cursor');
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [clearRevision, setClearRevision] = useState(0);
  const [positions, setPositions] = useState([]);
  const [prices, setPrices] = useState({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [side, setSide] = useState('BUY');
  const [lots, setLots] = useState('1');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [message, setMessage] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const { chain, status, error } = useMarketData(underlying);
  const { openOrder, closeOrder } = useOrders({ positions, setPositions, onClose: () => {} });

  // The relay supplies fresh chain prices. Keep token-indexed prices so positions,
  // watchlist and SL/TP rules all use the same market-data boundary.
  useEffect(() => {
    if (!chain) return;
    const next = { [INDEX_TOKEN[underlying]]: +chain.spot || 0 };
    (chain.rows || []).forEach((row) => { if (row.ceToken) next[row.ceToken] = +row.ce || 0; if (row.peToken) next[row.peToken] = +row.pe || 0; });
    setPrices(next);
  }, [chain, underlying]);

  const selectedPrice = selection ? prices[selection.token] : prices[INDEX_TOKEN[underlying]];
  const floating = positions.reduce((total, position) => {
    const price = prices[position.token];
    if (!price) return total;
    const multiplier = position.lotSize || chain?.lot || 1;
    return total + (position.side === 'BUY' ? price - position.entry : position.entry - price) * position.lots * multiplier;
  }, 0);
  const equity = CAPITAL + floating;
  const breached = floating <= -MAX_LOSS || floating <= -DAILY_LOSS;

  useEffect(() => { setTradingState({ positions, breached }); }, [positions, breached]);
  useEffect(() => {
    positions.forEach((position) => {
      const price = prices[position.token];
      if (!price) return;
      const stopHit = position.sl && (position.side === 'BUY' ? price <= position.sl : price >= position.sl);
      const targetHit = position.tp && (position.side === 'BUY' ? price >= position.tp : price <= position.tp);
      if (stopHit || targetHit) closePosition(position.id, stopHit ? 'Stop loss hit' : 'Target hit');
    });
    // Rules run whenever a new provider price is received.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);
  useEffect(() => { const onChange = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', onChange); return () => document.removeEventListener('fullscreenchange', onChange); }, []);

  const watchlist = useMemo(() => [
    { key: 'NIFTY', label: 'NIFTY 50', token: INDEX_TOKEN.NIFTY, ltp: prices[INDEX_TOKEN.NIFTY] },
    { key: 'BANKNIFTY', label: 'BANKNIFTY', token: INDEX_TOKEN.BANKNIFTY, ltp: prices[INDEX_TOKEN.BANKNIFTY] },
    ...positions.slice(0, 4).map((position) => ({ key: position.id, label: `${position.underlying} ${position.strike} ${position.type}`, token: position.token, ltp: prices[position.token], position })),
  ], [positions, prices]);

  function flash(kind, text) { setMessage({ kind, text }); window.setTimeout(() => setMessage(null), 4500); }
  function selectUnderlying(item) { if (item.position) { setSelection(item.position); setChartMode('strike'); } else { setUnderlying(item.key); setSelection(null); setChartMode('index'); } }
  function selectContract(row, type) { const token = type === 'CE' ? row.ceToken : row.peToken; if (!token) return; setSelection({ underlying, strike: row.strike, type, token }); setChartMode('strike'); }
  function submitOrder() {
    if (!selection) return flash('err', 'Pehle option chain se strike select karo.');
    const quantity = Number(lots);
    if (!Number.isInteger(quantity) || quantity < 1) return flash('err', 'Lots 1 ya usse zyada hone chahiye.');
    if (!selectedPrice) return flash('err', 'Live price ka wait karo.');
    openOrder({ ...selection, side, lots: quantity, entry: selectedPrice, sl: Number(sl) || null, tp: Number(tp) || null, lotSize: chain?.lot || 1 });
    setOrderOpen(false); setSl(''); setTp(''); flash('ok', `${side} ${quantity} lot ${underlying} ${selection.strike} ${selection.type} @ ${selectedPrice.toFixed(2)}`);
  }
  function closePosition(id, reason = 'Position closed') { closeOrder(id, reason); flash('ok', reason); }
  function toggleFullscreen() { if (!document.fullscreenElement) rootRef.current?.requestFullscreen?.(); else document.exitFullscreen?.(); }
  const chartToken = chartMode === 'index' ? INDEX_TOKEN[underlying] : selection?.token;
  const chartExchange = chartMode === 'index' ? 'NSE' : 'NFO';

  return <div ref={rootRef} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
    <TerminalLayout
      top={<><TopToolbar underlying={underlying} setUnderlying={(value) => { setUnderlying(value); setSelection(null); setChartMode('index'); }} chain={chain} status={status} breached={breached} fullscreen={fullscreen} onFullscreen={toggleFullscreen} onOrder={() => selection ? setOrderOpen(true) : flash('err', 'Pehle option chain se strike select karo.')} />{message && <div className={message.kind === 'ok' ? 'ok' : 'err'} style={{ marginBottom: 10 }}>{message.text}</div>}{error && status === 'offline' && <div className="err" style={{ marginBottom: 10 }}>Angel relay unavailable: {error.message}</div>}</>}
      left={<LeftToolbar tool={tool} setTool={setTool} visible={drawingsVisible} setVisible={setDrawingsVisible} onClear={() => { setClearRevision((value) => value + 1); flash('ok', 'Drawings cleared for this chart.'); }} />}
      center={<div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}><div style={{ fontFamily: 'Manrope', fontWeight: 800 }}>{chartMode === 'index' ? (underlying === 'NIFTY' ? 'NIFTY 50' : 'BANKNIFTY') : `${selection?.underlying} ${selection?.strike} ${selection?.type}`}<span className="num" style={{ marginLeft: 10, color: 'var(--blue)' }}>{selectedPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '—'}</span></div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 8, overflow: 'hidden' }}>{TIMEFRAMES.map((tf) => <button key={tf[0]} onClick={() => setTimeframe(tf)} style={{ padding: '5px 8px', background: timeframe[0] === tf[0] ? 'rgba(77,124,254,.18)' : 'transparent', color: timeframe[0] === tf[0] ? 'var(--blue)' : 'var(--muted)' }}>{tf[0]}</button>)}</div><div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 8, overflow: 'hidden' }}><button onClick={() => setChartMode('index')} style={{ padding: '5px 8px', color: chartMode === 'index' ? 'var(--blue)' : 'var(--muted)' }}>Index</button><button disabled={!selection} onClick={() => selection && setChartMode('strike')} style={{ padding: '5px 8px', color: chartMode === 'strike' ? 'var(--blue)' : 'var(--muted)' }}>Strike</button></div><IndicatorMenu active={activeIndicators} setActive={setActiveIndicators} /></div></div><ChartCanvas exchange={chartExchange} token={chartToken} symbol={chartMode === 'index' ? underlying : `${selection?.underlying}-${selection?.strike}-${selection?.type}`} interval={timeframe[1]} timeframe={timeframe[0]} onPrice={noop} tool={tool} drawingsVisible={drawingsVisible} chartKey={`${chartToken}:${timeframe[0]}`} clearRevision={clearRevision} activeIndicators={activeIndicators} /><div style={{ padding: '8px 14px', fontSize: 10.5, color: 'var(--dim)', borderTop: '1px solid var(--line)' }}>Real market data via Angel One · IST · simulated account — orders are not placed on any exchange</div></div>}
      right={<RightSidebar><Watchlist items={watchlist} onSelect={selectUnderlying} /><OptionChain chain={chain} selection={selection} onSelect={selectContract} /></RightSidebar>}
      bottom={<BottomPanel><AccountSummary equity={equity} floating={floating} /><PositionPanel positions={positions} prices={prices} onClose={closePosition} /></BottomPanel>}
    />
    <OrderPanel open={orderOpen} selection={selection} chain={chain} side={side} setSide={setSide} lots={lots} setLots={setLots} sl={sl} setSl={setSl} tp={tp} setTp={setTp} onClose={() => setOrderOpen(false)} onSubmit={submitOrder} />
  </div>;
}

function OptionChain({ chain, selection, onSelect }) { return <div className="card" style={{ padding: 0 }}><div style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}><h3 style={{ fontSize: 13.5 }}>Option Chain</h3><span className="dim" style={{ fontSize: 11 }}>click CE / PE</span></div><div style={{ maxHeight: 290, overflowY: 'auto' }}><table className="num" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}><thead><tr><th>CALL LTP</th><th>STRIKE</th><th>PUT LTP</th></tr></thead><tbody>{(chain?.rows || []).map((row) => <tr key={row.strike}><td onClick={() => onSelect(row, 'CE')} style={{ textAlign: 'center', padding: 8, cursor: 'pointer', color: selection?.token === row.ceToken ? 'var(--blue)' : undefined }}>{row.ce ?? '—'}</td><td style={{ textAlign: 'center', padding: 8, borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', color: row.strike === chain?.atm ? 'var(--gold)' : undefined }}>{row.strike}</td><td onClick={() => onSelect(row, 'PE')} style={{ textAlign: 'center', padding: 8, cursor: 'pointer', color: selection?.token === row.peToken ? 'var(--blue)' : undefined }}>{row.pe ?? '—'}</td></tr>)}{!chain?.rows?.length && <tr><td colSpan="3" className="muted" style={{ padding: 16, textAlign: 'center' }}>Chain load ho rahi hai…</td></tr>}</tbody></table></div></div>; }
function AccountSummary({ equity, floating }) { return <div className="card num" style={{ padding: '10px 18px', display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 10, fontSize: 13.5 }}><Metric label="Balance" value={inr(CAPITAL)} /><Metric label="Equity" value={inr(equity)} color={floating >= 0 ? 'var(--green)' : 'var(--red)'} /><Metric label="Floating P&L" value={(floating >= 0 ? '+' : '−') + inr(floating)} color={floating >= 0 ? 'var(--green)' : 'var(--red)'} /><span className="dim" style={{ marginLeft: 'auto', fontSize: 11 }}>Daily Loss ₹50,000 · Max Loss ₹1,00,000 (auto-breach)</span></div>; }
function Metric({ label, value, color }) { return <div><div className="dim" style={{ fontSize: 11 }}>{label}</div><b style={{ color }}>{value}</b></div>; }
