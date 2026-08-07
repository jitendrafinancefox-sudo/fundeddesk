'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, LineChart as LineChartIcon, ChevronDown } from 'lucide-react';
import { INDICATORS } from '@/components/chart/IndicatorEngine';

// Opt-in indicator picker. Reads the catalogue from IndicatorEngine so this
// component never needs editing when an indicator is added or removed.
export default function IndicatorMenu({ active = [], setActive }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    const esc = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = (id) => setActive(active.includes(id) ? active.filter((item) => item !== id) : [...active, id]);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((value) => !value)}
        title="Indicators"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px',
          border: '1px solid var(--line2)', borderRadius: 8,
          color: active.length ? 'var(--blue)' : 'var(--muted)', fontSize: 12.5,
        }}
      >
        <LineChartIcon size={14} />
        Indicators
        {active.length > 0 && (
          <span style={{ background: 'rgba(77,124,254,.22)', color: 'var(--blue)', borderRadius: 99, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>
            {active.length}
          </span>
        )}
        <ChevronDown size={13} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 34, width: 218, zIndex: 80,
          background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 10,
          boxShadow: '0 16px 40px rgba(0,0,0,.15)', overflow: 'hidden',
        }}>
          {INDICATORS.map((indicator) => {
            const on = active.includes(indicator.id);
            return (
              <button
                key={indicator.id}
                onClick={() => toggle(indicator.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                  padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--line)',
                  color: on ? 'var(--text)' : 'var(--muted)',
                  background: on ? 'rgba(77,124,254,.10)' : 'transparent',
                }}
              >
                <span style={{ width: 14, display: 'grid', placeItems: 'center' }}>
                  {on && <Check size={13} color="var(--blue)" />}
                </span>
                <span style={{ flex: 1 }}>{indicator.label}</span>
                {indicator.pane === 'lower' && <span className="dim" style={{ fontSize: 10 }}>panel</span>}
              </button>
            );
          })}
          {active.length > 0 && (
            <button onClick={() => setActive([])} style={{ width: '100%', padding: '9px 12px', fontSize: 12.5, color: 'var(--red)' }}>
              Remove all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
