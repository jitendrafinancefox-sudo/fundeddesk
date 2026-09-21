'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Single compact control replacing the always-visible 1m/5m/15m/1H/1D row
// (Phase 21B, Section 2B). Same QUICK_TIMEFRAMES list the row used to
// render — this is purely a presentation change; selecting an entry calls
// the SAME switchTimeframe(panel, tf.relay) the buttons called, so every
// Phase 21A guarantee (race-safe fetch, drawing-scope isolation, no stale
// candles) is untouched.
export default function TVTimeframeDropdown({ timeframes, active, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const activeTf = timeframes.find((tf) => tf.relay === active);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 8px', fontSize: 11, fontWeight: 700,
          fontFamily: 'Inter, sans-serif', borderRadius: 5,
          border: '1px solid var(--line2)', background: 'var(--bg2)',
          color: 'var(--green)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {activeTf?.label || '—'}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
            minWidth: 88, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,.3)', overflow: 'hidden',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {timeframes.map((tf) => (
            <button
              key={tf.tv}
              role="option"
              aria-selected={tf.relay === active}
              onClick={() => { onSelect(tf.relay); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: tf.relay === active ? 'rgba(34,197,139,.14)' : 'transparent',
                color: tf.relay === active ? 'var(--green)' : 'var(--text)',
                fontWeight: tf.relay === active ? 700 : 500,
              }}
              onMouseEnter={(e) => { if (tf.relay !== active) e.currentTarget.style.background = 'var(--bg2)'; }}
              onMouseLeave={(e) => { if (tf.relay !== active) e.currentTarget.style.background = 'transparent'; }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
