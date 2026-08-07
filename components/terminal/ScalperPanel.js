'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Zap } from 'lucide-react';

export default function ScalperPanel({ open, selection, chain, prices, onClose, onSubmit }) {
  const [lots, setLots] = useState('1');
  const [side, setSide] = useState('BUY');
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) { setLots('1'); setSide('BUY'); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);

  if (!open || !selection) return null;

  const lotSize = chain?.lot || 1;
  const quantity = Number(lots || 1) * lotSize;
  const lastPrice = prices?.[selection.token] || selection.lastPrice || 0;

  const handleOrder = (orderSide) => {
    setSide(orderSide);
    onSubmit?.();
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(0,0,0,0.1)',
      }} />
      <div style={{
        position: 'fixed', top: 50, right: 16,
        width: 220,
        background: '#ffffff',
        border: '1px solid #e0e3eb',
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        zIndex: 100,
        fontFamily: 'Inter, sans-serif',
        animation: 'scalperIn 0.15s ease-out',
      }}>
        <style>{`@keyframes scalperIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderBottom: '1px solid #f0f1f5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Zap size={12} color="#2962ff" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#222222', fontFamily: 'Inter, sans-serif' }}>Scalper</span>
          </div>
          <button onClick={onClose} style={{
            width: 20, height: 20, borderRadius: 4,
            display: 'grid', placeItems: 'center',
            background: 'transparent', border: 'none',
            color: '#787b86', cursor: 'pointer',
          }}>
            <X size={12} />
          </button>
        </div>

        {/* Symbol */}
        <div style={{ padding: '6px 10px', fontSize: 11, color: '#787b86', fontFamily: 'Inter, sans-serif' }}>
          {selection.underlying || 'NIFTY'} {selection.strike} {selection.type}
        </div>

        {/* Last Price */}
        <div style={{ padding: '0 10px 6px', fontSize: 16, fontWeight: 700, color: '#222222', fontFamily: 'Inter, sans-serif' }}>
          {mounted ? `₹${lastPrice.toFixed(2)}` : '₹—'}
        </div>

        {/* Lots */}
        <div style={{ padding: '0 10px 8px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#787b86', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
            Lots
          </div>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e3eb', borderRadius: 4, overflow: 'hidden' }}>
            <button onClick={() => setLots(String(Math.max(1, Number(lots) - 1)))} style={{
              width: 28, height: 28, border: 'none', background: '#f8f9fa',
              color: '#787b86', fontSize: 12, cursor: 'pointer',
            }}>−</button>
            <input
              ref={inputRef}
              value={lots} type="number" min="1"
              onChange={(e) => setLots(e.target.value)}
              style={{
                flex: 1, height: 28, border: 'none', textAlign: 'center',
                fontSize: 13, fontWeight: 600, color: '#222222',
                background: 'transparent', outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button onClick={() => setLots(String(Number(lots) + 1))} style={{
              width: 28, height: 28, border: 'none', background: '#f8f9fa',
              color: '#787b86', fontSize: 12, cursor: 'pointer',
            }}>+</button>
          </div>
          <div style={{ fontSize: 10, color: '#b2b5be', marginTop: 2 }}>Qty: {quantity}</div>
        </div>

        {/* BUY / SELL Buttons */}
        <div style={{ display: 'flex', gap: 4, padding: '0 10px 10px' }}>
          <button
            onClick={() => handleOrder('BUY')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 4,
              fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              background: '#26a69a', color: '#ffffff',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(38,166,154,0.3)',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e8e84'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#26a69a'; }}
          >
            BUY
          </button>
          <button
            onClick={() => handleOrder('SELL')}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 4,
              fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              background: '#ef5350', color: '#ffffff',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(239,83,80,0.3)',
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ef5350'; }}
          >
            SELL
          </button>
        </div>
      </div>
    </>
  );
}
