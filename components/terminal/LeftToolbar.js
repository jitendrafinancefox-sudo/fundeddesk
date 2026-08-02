'use client';
import { useEffect, useRef, useState } from 'react';
import { MousePointer2, Slash, Minus, Square, Circle, Type, Eye, EyeOff, Trash2, ArrowUpDown, ArrowRight, MoveDiagonal, TrendingUp, Ruler, Check } from 'lucide-react';

const GROUPS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, tools: [['cursor', MousePointer2, 'Cursor']] },
  { id: 'lines', label: 'Lines', icon: Slash, tools: [
    ['trend', Slash, 'Trend Line'],
    ['ray', ArrowRight, 'Ray'],
    ['extended', MoveDiagonal, 'Extended Line'],
    ['hline', Minus, 'Horizontal Line'],
    ['vline', ArrowUpDown, 'Vertical Line'],
  ] },
  { id: 'shapes', label: 'Shapes', icon: Square, tools: [
    ['rect', Square, 'Rectangle'],
    ['ellipse', Circle, 'Ellipse'],
  ] },
  { id: 'fib', label: 'Fibonacci', icon: TrendingUp, tools: [['fib', TrendingUp, 'Fib Retracement']] },
  { id: 'measure', label: 'Measure', icon: Ruler, tools: [['measure', Ruler, 'Measure']] },
  { id: 'textarrow', label: 'Text / Arrow', icon: Type, tools: [['text', Type, 'Text Note'], ['arrow', ArrowRight, 'Arrow']] },
];

export default function LeftToolbar({ tool, setTool, visible, setVisible, onClear }) {
  const [open, setOpen] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (event) => { if (barRef.current && !barRef.current.contains(event.target)) setOpen(null); };
    const esc = (event) => { if (event.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

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
              <div style={{ position: 'absolute', left: 38, top: 0, width: 172, zIndex: 90, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.5)', overflow: 'hidden' }}>
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
      <button title="Toggle drawings" onClick={() => setVisible(!visible)} style={{ width: 30, height: 30, color: 'var(--muted)' }}>{visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
      <button title="Clear drawings" onClick={onClear} style={{ width: 30, height: 30, color: 'var(--red)' }}><Trash2 size={15} /></button>
    </div>
  );
}
