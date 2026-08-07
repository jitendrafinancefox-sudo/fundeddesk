'use client';
import { useEffect, useState } from 'react';
import { marketData } from '@/services/marketData';

function shadeColor(hex, opacity) {
  const rgb = hex.replace('#', '').match(/.{2}/g);
  if (!rgb) return `rgba(34,197,139,${opacity})`;
  return `rgba(${parseInt(rgb[0], 16)}, ${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${opacity})`;
}

const INDICES = ['NIFTY', 'BANKNIFTY'];

export default function Page() {
  const [stocks, setStocks] = useState([]);
  const [status, setStatus] = useState('checking');
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState('NIFTY');

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function tick() {
      try {
        const data = await marketData.heatmap(selected, controller.signal);
        if (mounted) { setStocks(data); setStatus('connected'); setErr(null); }
      } catch (e) {
        if (e.name !== 'AbortError' && mounted) { setStatus('offline'); setErr(e); }
      }
    }

    tick();
    const id = setInterval(tick, 3000);
    return () => { mounted = false; clearInterval(id); controller.abort(); };
  }, [selected]);

  function tileColor(change) {
    if (change > 0) {
      const alpha = Math.min(0.55, 0.15 + Math.abs(change) / 20);
      return shadeColor('#22C58B', alpha);
    }
    const alpha = Math.min(0.55, 0.15 + Math.abs(change) / 20);
    return shadeColor('#F0525F', alpha);
  }

  if (status === 'offline') return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="err">Market data feed offline. Retrying…</p></div>;
  if (status === 'checking' && !stocks.length) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="muted">Connecting to market feed…</p></div>;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, border: '1px solid var(--line2)', borderRadius: 7, padding: 3, background: 'var(--line)', height: 22 }}>
          {INDICES.map((idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              style={{
                padding: '2px 10px', fontSize: 11.5, borderRadius: 5,
                background: selected === idx ? 'var(--bg)' : 'transparent',
                color: selected === idx ? 'var(--green)' : 'var(--muted)',
                border: 'none', cursor: 'pointer', fontWeight: selected === idx ? 700 : 500,
              }}
            >
              {idx}
            </button>
          ))}
        </div>
        <span>{stocks.length} symbols • updates every 3s</span>
        {status === 'connected' && <span className="tag tag-green" style={{ fontSize: 11 }}>LIVE</span>}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: 8,
      }}>
        {stocks.map((s) => {
          const change = s.dayChangePercent || 0;
          return (
            <div
              key={s.symbol || s.token}
              title={s.symbol}
              style={{
                background: tileColor(change),
                border: '1px solid var(--line2)',
                borderRadius: 8,
                padding: '10px 8px',
                height: 56,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {s.symbol || s.token}
              </span>
              <span style={{ fontSize: 11, color: change >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {change >= 0 ? '+' : ''}{change?.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
