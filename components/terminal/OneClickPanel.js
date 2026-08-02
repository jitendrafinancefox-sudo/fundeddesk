'use client';
import { useState } from 'react';

const fmt = (value) => value == null ? '—' : Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// One-click BUY/SELL overlay — a plain React panel positioned at the
// bottom-left corner of the chart canvas area. The symbol name and price
// label live in the header ABOVE the canvas, so the 12px margins guarantee
// no overlap. Purely presentational: all market data and order execution
// flow in through props from the terminal.
export default function OneClickPanel({ bid, ask, onBuy, onSell, multiplier = 1 }) {
  const [qty, setQty] = useState('1');
  const lots = Math.max(1, Number(qty) || 1);
  const quantity = lots * multiplier;
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, zIndex: 20,
      display: 'flex', alignItems: 'stretch', gap: 4,
      background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 8, padding: 4,
      boxShadow: '0 4px 16px rgba(0,0,0,.35)',
      fontFamily: 'Manrope, sans-serif',
    }}>
      <button
        className="btn btn-red btn-sm"
        title="SELL market order at bid"
        onClick={() => onSell?.(lots, quantity)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '5px 10px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>SELL</span>
        <span className="num" style={{ fontSize: 11 }}>{fmt(bid)}</span>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '0 3px' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: 'var(--muted)' }}>LOTS</span>
        <input
          type="number" min="1" value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ width: 52, boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 12, textAlign: 'center', outline: 'none' }}
        />
        <span className="num" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '.02em' }}>{quantity > 0 ? `${quantity} ctr · ×${multiplier}` : ''}</span>
      </div>
      <button
        className="btn btn-green btn-sm"
        title="BUY market order at ask"
        onClick={() => onBuy?.(lots, quantity)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '5px 10px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>BUY</span>
        <span className="num" style={{ fontSize: 11 }}>{fmt(ask)}</span>
      </button>
    </div>
  );
}
