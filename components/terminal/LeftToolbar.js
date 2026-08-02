'use client';
import { useEffect, useRef, useState } from 'react';
import { MousePointer2, Slash, Minus, Square, Circle, Type, Eye, EyeOff, Trash2, ArrowUpDown, ArrowRight, MoveDiagonal, TrendingUp, Ruler, Check, ArrowRightToLine, ArrowUp, ArrowDown, Info, Magnet, Crosshair } from 'lucide-react';

const GROUPS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, tools: [['cursor', MousePointer2, 'Cursor']] },
  { id: 'lines', label: 'Lines', icon: Slash, tools: [
    ['trend', Slash, 'Trend Line'],
    ['ray', ArrowRight, 'Ray'],
    ['extended', MoveDiagonal, 'Extended Line'],
    ['hline', Minus, 'Horizontal Line'],
    ['horizontalRay', ArrowRightToLine, 'Horizontal Ray'],
    ['vline', ArrowUpDown, 'Vertical Line'],
  ] },
  { id: 'shapes', label: 'Shapes', icon: Square, tools: [
    ['rect', Square, 'Rectangle'],
    ['ellipse', Circle, 'Ellipse'],
  ] },
  { id: 'fib', label: 'Fibonacci', icon: TrendingUp, tools: [['fib', TrendingUp, 'Fib Retracement']] },
  { id: 'measure', label: 'Measure', icon: Ruler, tools: [['measure', Ruler, 'Measure']] },
  { id: 'textarrow', label: 'Text / Arrow / Marks', icon: Type, tools: [
    ['text', Type, 'Text Note'],
    ['arrow', ArrowRight, 'Arrow'],
    ['arrowMarkUp', ArrowUp, 'Arrow Mark Up'],
    ['arrowMarkDown', ArrowDown, 'Arrow Mark Down'],
    ['infoLine', Info, 'Info Line'],
  ] },
];

const SNAP_MODES = [['ohlc', 'OHLC'], ['open', 'Open'], ['high', 'High'], ['low', 'Low'], ['close', 'Close']];

export default function LeftToolbar({ tool, setTool, visible, setVisible, onClear, snap, setSnap }) {
  const [open, setOpen] = useState(null);
  const [snapOpen, setSnapOpen] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    if (!open && !snapOpen) return;
    const away = (event) => { if (barRef.current && !barRef.current.contains(event.target)) { setOpen(null); setSnapOpen(false); } };
    const esc = (event) => { if (event.key === 'Escape') { setOpen(null); setSnapOpen(false); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open, snapOpen]);

  const groupActive = (group) => group.tools.some(([id]) => id === tool);

  return (
    <div ref={barRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 7px', borderRight: '1px solid var(--line)' }}>
      {GROUPS.map((group) => {
        const [defaultId, , defaultLabel] = group.tools[0];
        const active = groupActive(group);
        const Icon = group.icon;
        return (
          <div key={group.id} style={{ position: 'relative' }}>
            <button
              title={group.label}
              onClick={() => { setTool(defaultId); setOpen((current) => (current === group.id ? null : group.id)); }}
              style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: active ? 'rgba(77,124,254,.18)' : 'transparent', color: active ? 'var(--blue)' : 'var(--muted)' }}
            >
              <Icon size={15} />
            </button>
            {open === group.id && group.id !== 'cursor' && (
              <div style={{ position: 'absolute', left: 38, top: 0, width: 184, zIndex: 90, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.5)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', borderBottom: '1px solid var(--line)' }}>{group.label}</div>
                {group.tools.map(([id, ToolIcon, label]) => {
                  const on = id === tool;
                  return (
                    <button
                      key={id}
                      title={label}
                      onClick={() => { setTool(id); setOpen(null); }}
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
                      <ToolIcon size={14} />
                      <span style={{ flex: 1 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ width: 20, height: 1, background: 'var(--line)', margin: '4px 0' }} />
      <div style={{ position: 'relative' }}>
        <button title={snap?.magnet ? 'Snap: ' + (SNAP_MODES.find(([m]) => m === snap.mode)?.[1] || 'OHLC') + ' (click to toggle)' : 'Snap off (click to toggle)'} onClick={() => setSnap({ ...snap, magnet: !snap?.magnet })} style={{ width: 30, height: 30, color: snap?.magnet ? 'var(--blue)' : 'var(--dim)', opacity: snap?.magnet ? 1 : .5 }}><Magnet size={15} /></button>
        <button title="Snap mode" onClick={() => setSnapOpen(!snapOpen)} style={{ width: 30, height: 30, color: 'var(--muted)' }}><Crosshair size={15} /></button>
        {snapOpen && (
          <div style={{ position: 'absolute', left: 38, top: 0, width: 140, zIndex: 90, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.5)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', borderBottom: '1px solid var(--line)' }}>Snap to</div>
            {SNAP_MODES.map(([mode, label]) => (
              <button key={mode} onClick={() => { setSnap({ ...snap, mode }); setSnapOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12.5, borderBottom: '1px solid var(--line)', color: snap?.mode === mode ? 'var(--text)' : 'var(--muted)', background: snap?.mode === mode ? 'rgba(77,124,254,.10)' : 'transparent' }}>
                <span style={{ width: 14, display: 'grid', placeItems: 'center' }}>{snap?.mode === mode && <Check size={13} color="var(--blue)" />}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: 20, height: 1, background: 'var(--line)', margin: '4px 0' }} />
      <button title="Toggle drawings" onClick={() => setVisible(!visible)} style={{ width: 30, height: 30, color: 'var(--muted)' }}>{visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
      <button title="Clear drawings" onClick={onClear} style={{ width: 30, height: 30, color: 'var(--red)' }}><Trash2 size={15} /></button>
    </div>
  );
}
