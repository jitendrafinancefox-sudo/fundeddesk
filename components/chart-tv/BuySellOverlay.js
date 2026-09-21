'use client';
import { usePrice } from '@/stores/PriceBus';
import { TradingStore } from '@/stores/TradingStore';

const btnBase = {
  pointerEvents: 'auto',
  border: 'none',
  borderRadius: 6,
  color: '#ffffff',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 700,
  fontSize: 11,
  padding: '7px 10px',
  cursor: 'pointer',
  minWidth: 74,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  lineHeight: 1.2,
  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
};

export default function BuySellOverlay({ exchange = 'NSE', token, symbol, underlying, kind = 'future', onOrder }) {
  const quote = usePrice(token);
  // bid/ask displayed on the BUY/SELL buttons fall back to LTP when no real
  // bid/ask exists — an honest "your paper order references this price",
  // not a depth claim. `spread`, though, is only ever computed from the
  // SOURCE fields (quote.bid/quote.ask directly, before any fallback) so it
  // reads "—" rather than a fabricated "0.00" whenever no real bid/ask was
  // actually sourced (e.g. index spot instruments — see LiveQuoteFeed.js).
  const bid = quote?.bid ?? quote?.ltp ?? null;
  const ask = quote?.ask ?? quote?.ltp ?? null;
  const spread = quote?.bid != null && quote?.ask != null ? Math.max(0, quote.ask - quote.bid) : null;

  // When an order-entry callback is provided, clicking BUY/SELL opens the
  // OrderPanel (full lots/SL/TP flow) instead of placing the order directly.
  const place = (side) => {
    if (onOrder) { onOrder(side); return; }
    TradingStore.placeOrder({
      exchange,
      token,
      symbol,
      underlying,
      kind,
      side,
      lots: 1,
      signalPrice: side === 'BUY' ? (ask ?? quote?.ltp ?? undefined) : (bid ?? quote?.ltp ?? undefined),
    });
  };

  return (
    <div className="buy-sell-overlay" style={{
      position: 'absolute',
      top: 34,
      left: 10,
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      pointerEvents: 'none',
    }}>
      <button
        title={`SELL ${symbol}`}
        onClick={() => place('SELL')}
        style={{ ...btnBase, background: 'var(--red)' }}
      >
        <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 600 }}>SELL</span>
        <span>{bid != null ? bid.toFixed(2) : '—'}</span>
      </button>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'Inter, sans-serif', minWidth: 34, textAlign: 'center' }}>
        {spread != null ? spread.toFixed(2) : '—'}
      </span>
      <button
        title={`BUY ${symbol}`}
        onClick={() => place('BUY')}
        style={{ ...btnBase, background: 'var(--blue)' }}
      >
        <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 600 }}>BUY</span>
        <span>{ask != null ? ask.toFixed(2) : '—'}</span>
      </button>
    </div>
  );
}
