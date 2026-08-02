'use client';
import { useEffect, useState } from 'react';
import { X, Lock, LockOpen } from 'lucide-react';
import { drawingLabelFor } from '../drawing/DrawingDefinitions';

const COLORS = ['#f5b93e', '#4d7cfe', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#f8fafc'];
const WIDTHS = [1, 1.5, 2, 3];

// TradingView-style properties card, opened by double-clicking a drawing.
// Every change is applied through the interaction (one undoable history
// delta per change). Local state mirrors the drawing so the panel stays
// responsive while the canvas updates.
export default function PropertiesPanel({ drawing, onStyle, onLockToggle, onClose }) {
  const [color, setColor] = useState(drawing.style?.color || '#f5b93e');
  const [lineWidth, setLineWidth] = useState(drawing.style?.lineWidth || 1.5);
  const [locked, setLocked] = useState(Boolean(drawing.locked));
  useEffect(() => { setColor(drawing.style?.color || '#f5b93e'); setLineWidth(drawing.style?.lineWidth || 1.5); setLocked(Boolean(drawing.locked)); }, [drawing.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (patch) => onStyle(patch);
  const row = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 };
  return (
    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 110, width: 210, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,.5)', padding: 12, color: 'var(--text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>{drawingLabelFor(drawing.drawingType)}</b>
        <button onClick={onClose} style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
      </div>
      <div style={row}>
        <span className="dim" style={{ width: 62 }}>Color</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {COLORS.map((c) => <button key={c} title={c} onClick={() => { setColor(c); pick({ color: c }); }} style={{ width: 16, height: 16, borderRadius: 4, background: c, outline: color === c ? '2px solid #ffffff' : 'none', outlineOffset: 1 }} />)}
        </div>
      </div>
      <div style={{ ...row, marginTop: 10 }}>
        <span className="dim" style={{ width: 62 }}>Width</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {WIDTHS.map((w) => <button key={w} title={`${w}px`} onClick={() => { setLineWidth(w); pick({ lineWidth: w }); }} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line2)', display: 'grid', placeItems: 'center', background: lineWidth === w ? 'rgba(77,124,254,.18)' : 'transparent', color: lineWidth === w ? 'var(--blue)' : 'var(--muted)' }}><span style={{ width: w * 2, height: 2, background: 'currentColor', borderRadius: 2 }} /></button>)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button onClick={() => { const next = !locked; setLocked(next); onLockToggle(next); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: locked ? 'var(--blue)' : 'var(--muted)' }}>
          {locked ? <Lock size={13} /> : <LockOpen size={13} />}{locked ? 'Locked' : 'Unlocked'}
        </button>
        <span className="dim" style={{ fontSize: 11 }}>dbl-click again to close</span>
      </div>
    </div>
  );
}
