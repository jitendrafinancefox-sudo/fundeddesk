'use client';
import { useMemo, useState } from 'react';
export default function Watchlist({ items, onSelect }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => (items || []).filter((item) => (item.symbol || '').toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );
  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13.5, marginBottom: 8 }}>Watchlist</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol…"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12.5, outline: 'none' }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table className="num" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 12px', fontWeight: 700 }}>Symbol</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700 }}>Bid</th>
              <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700 }}>Ask</th>
              <th style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700 }}>Daily Change%</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.key} onClick={() => onSelect?.(item)} style={{ cursor: 'pointer' }}>
                <td style={{ padding: '7px 12px', borderTop: '1px solid var(--line)', fontWeight: 600 }}>{item.symbol}</td>
                <td style={{ padding: '7px 4px', textAlign: 'right', color: 'var(--muted)' }}>{item.bid?.toFixed(2) ?? '—'}</td>
                <td style={{ padding: '7px 4px', textAlign: 'right', color: 'var(--muted)' }}>{item.ask?.toFixed(2) ?? '—'}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: item.change == null ? 'var(--muted)' : (item.change >= 0 ? 'var(--green)' : 'var(--red)') }}>
                  {item.change == null ? '—' : (item.change >= 0 ? '+' : '') + item.change.toFixed(2) + '%'}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="4" className="muted" style={{ padding: 18, textAlign: 'center' }}>No symbols match</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
