'use client';
import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { usePrice } from '@/stores/PriceBus';
import { fmtNum, fmtQty, th } from './tradingUI';

const LEVELS = 6;

function hashTick(bucket, i, j) {
  const n = Math.sin(bucket + i * 7.13 + j * 13.7 + 1) * 10000;
  return Math.abs(Math.round(n)) % 97; // 0..96
}

function makeQty(price, i, bucket) {
  const base = 60 + hashTick(bucket, price * 7, i) * 6;
  return Math.round(base / 25) * 25 + 25;
}

// Order Book — live L2 depth ladder synthesized around the LTP (the demo
// relay only streams spot/chain trades, so depth is modeled, but bids/asks
// update on every price tick). Best bid & best ask rows are highlighted.
// `showBidAsk={false}` hides the price columns (used by /tv-chart).
export default function OrderBook({ token, kind, showBidAsk = true }) {
  const quote = usePrice(token);
  const ltp = quote.ltp;

  const tick = useMemo(() => {
    if (!token) return 1;
    // Options price in 0.05 steps; broad indices tick in whole numbers.
    return kind === 'option' ? 0.05 : 1;
  }, [token, kind]);

  const book = useMemo(() => {
    if (ltp == null) return null;
    const bucket = Math.floor(Date.now() / 6000); // depth jitters every 6s
    let base = ltp;
    // Anchor the mid around the live LTP (bid/ask route to it).
    const asks = [];
    const bids = [];
    for (let i = 0; i < LEVELS; i++) {
      const askPrice = base + tick * (i + 1);
      const bidPrice = base - tick * (i + 1);
      asks.push({ price: askPrice, qty: makeQty(askPrice, i, bucket) });
      bids.push({ price: bidPrice, qty: makeQty(bidPrice, i, bucket) });
    }
    const bestBid = bids[0].price;
    const bestAsk = asks[0].price;
    return { bids, asks, bestBid, bestAsk, spread: bestAsk - bestBid };
  }, [ltp, tick]);

  if (!book) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
        Waiting for live price…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        <BookOpen size={13} color="var(--blue)" />
        Order Book
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)' }}>
          Spread <b style={{ color: 'var(--text)' }}>{fmtNum(book.spread)}</b>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: showBidAsk ? '1fr 1fr 1fr 1fr' : '1fr 1fr', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={th}>Bid Qty</span>
          {showBidAsk && <span style={{ ...th, textAlign: 'right' }}>Bid Price</span>}
          {showBidAsk && <span style={{ ...th, textAlign: 'right' }}>Ask Price</span>}
          <span style={{ ...th, textAlign: 'right' }}>Ask Qty</span>
        </div>

        {/* Ladder: N bid rows under N ask rows (top = best) */}
        <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {[...book.asks].reverse().map((ask, i) => (
            <LadderRow key={`a-${i}`} side="ask" isBest={ask.price === book.bestAsk} price={ask.price} qty={ask.qty} showBidAsk={showBidAsk} />
          ))}
          {[...book.bids].map((bid, i) => (
            <LadderRow key={`b-${i}`} side="bid" isBest={bid.price === book.bestBid} price={bid.price} qty={bid.qty} showBidAsk={showBidAsk} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LadderRow({ side, isBest, price, qty, showBidAsk = true }) {
  const bid = side === 'bid';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: showBidAsk ? '1fr 1fr 1fr 1fr' : '1fr 1fr',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 11,
        borderBottom: '1px solid var(--bg2)',
        background: isBest ? (bid ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)') : 'transparent',
        position: 'relative',
      }}
    >
      {/* depth bar */}
      <div style={{
        position: 'absolute', inset: 0, right: 'auto',
        width: `${Math.min(qty / 700, 1) * 100}%`,
        background: bid ? 'rgba(38,166,154,0.08)' : 'rgba(239,83,80,0.08)',
        pointerEvents: 'none',
      }} />
      <span style={{ ...cellStyle, color: bid ? 'var(--text)' : 'transparent' }}>{fmtQty(qty)}</span>
      {showBidAsk && <span style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: bid ? 'var(--green)' : 'transparent' }}>{fmtNum(price)}</span>}
      {showBidAsk && <span style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: !bid ? 'var(--red)' : 'transparent' }}>{fmtNum(price)}</span>}
      <span style={{ ...cellStyle, textAlign: 'right', color: !bid ? 'var(--text)' : 'transparent' }}>{fmtQty(qty)}</span>
    </div>
  );
}

const cellStyle = { padding: '4px 10px', position: 'relative', fontVariantNumeric: 'tabular-nums' };