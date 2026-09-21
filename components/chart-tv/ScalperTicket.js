'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Zap } from 'lucide-react';

// Floating quick Buy/Sell ticket for Scalper mode (Phase 21B, Section 4).
// Anchored near the chart click that opened it, clamped inside the
// viewport. Submitting calls the SAME TradingStore.placeOrder lifecycle the
// main order ticket uses (via onSubmit, passed in by TVTerminal) — this
// component owns no execution logic of its own, only the quantity/side UI.
export default function ScalperTicket({ x, y, symbol, price, lotSize, onSubmit, onClose }) {
  const [lots, setLots] = useState(1);
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    const el = ref.current;
    const w = el?.offsetWidth || 220;
    const h = el?.offsetHeight || 180;
    const margin = 8;
    const left = Math.min(Math.max(margin, x), window.innerWidth - w - margin);
    const top = Math.min(Math.max(margin, y), window.innerHeight - h - margin);
    setPos({ left, top });
    // Position is computed once from the click point that opened the
    // ticket — it does not track the mouse afterward, matching the
    // reference's "anchored near the click" behavior rather than a
    // tooltip that follows the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const quantity = Math.max(1, lots) * (lotSize || 1);
  const orderValue = price != null ? quantity * price : null;
  const inr = (v) => (Number.isFinite(v) ? '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—');

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Scalper quick order"
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: 250,
        width: 220, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        fontFamily: 'Inter, sans-serif', overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
          <Zap size={12} color="var(--brand)" /> Scalper
        </span>
        <button onClick={onClose} title="Close" aria-label="Close scalper ticket" style={{
          width: 18, height: 18, borderRadius: 4, display: 'grid', placeItems: 'center',
          background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer',
        }}>
          <X size={12} />
        </button>
      </div>

      <div style={{ padding: '8px 10px 4px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{symbol}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {price != null ? Number(price).toFixed(2) : '—'}
        </div>
      </div>

      <div style={{ padding: '0 10px 8px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
          Lots
        </div>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <button onClick={() => setLots((v) => Math.max(1, v - 1))} title="Decrease quantity" style={{
            width: 26, height: 26, border: 'none', background: 'var(--bg2)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
          }}>−</button>
          <input
            value={lots} type="number" min="1" aria-label="Lots"
            onChange={(e) => setLots(Math.max(1, Number(e.target.value) || 1))}
            style={{
              flex: 1, height: 26, border: 'none', textAlign: 'center',
              fontSize: 12, fontWeight: 600, color: 'var(--text)', background: 'transparent',
            }}
          />
          <button onClick={() => setLots((v) => v + 1)} title="Increase quantity" style={{
            width: 26, height: 26, border: 'none', background: 'var(--bg2)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
          }}>+</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>
          Qty {quantity.toLocaleString('en-IN')} · Value {inr(orderValue)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 10px 10px' }}>
        <button
          onClick={() => onSubmit('SELL', lots)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
            background: 'var(--red)', color: '#ffffff',
          }}
        >
          SELL
        </button>
        <button
          onClick={() => onSubmit('BUY', lots)}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
            background: 'var(--green)', color: '#052018',
          }}
        >
          BUY
        </button>
      </div>
    </div>
  );
}
