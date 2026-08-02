'use client';
import { useEffect, useState } from 'react';
import { X, Lock, LockOpen } from 'lucide-react';
import { drawingLabelFor, isZoneType, isChannelType, zoneColorFor } from '../drawing/DrawingDefinitions';

const COLORS = ['#f5b93e', '#4d7cfe', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#f8fafc'];
const WIDTHS = [1, 1.5, 2, 3];

// TradingView-style properties card, opened by double-clicking a drawing.
// Every change is applied through the interaction (one undoable history
// delta per change). Local state mirrors the drawing so the panel stays
// responsive while the canvas updates. Zone drawings get fill opacity and
// band-extension controls; channels get band opacity, extension, dash and
// arrow controls.
export default function PropertiesPanel({ drawing, onStyle, onLockToggle, onClose }) {
  const zone = isZoneType(drawing.drawingType);
  const channel = isChannelType(drawing.drawingType);
  const baseColor = zone ? zoneColorFor(drawing.drawingType) : '#f5b93e';
  const [color, setColor] = useState(drawing.style?.color || baseColor);
  const [lineWidth, setLineWidth] = useState(drawing.style?.lineWidth || 1.5);
  const [opacity, setOpacity] = useState(drawing.style?.opacity ?? 0.22);
  const [extendLeft, setExtendLeft] = useState(drawing.style?.extendLeft !== false);
  const [extendRight, setExtendRight] = useState(drawing.style?.extendRight !== false);
  const [showLabel, setShowLabel] = useState(drawing.style?.showLabel !== false);
  const [showPrice, setShowPrice] = useState(drawing.style?.showPrice !== false);
  const [dash, setDash] = useState(Boolean(drawing.style?.dash));
  const [arrow, setArrow] = useState(Boolean(drawing.style?.arrow));
  const [locked, setLocked] = useState(Boolean(drawing.locked));
  useEffect(() => { setColor(drawing.style?.color || (isZoneType(drawing.drawingType) ? zoneColorFor(drawing.drawingType) : '#f5b93e')); setLineWidth(drawing.style?.lineWidth || 1.5); setOpacity(drawing.style?.opacity ?? 0.22); setExtendLeft(drawing.style?.extendLeft !== false); setExtendRight(drawing.style?.extendRight !== false); setShowLabel(drawing.style?.showLabel !== false); setShowPrice(drawing.style?.showPrice !== false); setDash(Boolean(drawing.style?.dash)); setArrow(Boolean(drawing.style?.arrow)); setLocked(Boolean(drawing.locked)); }, [drawing.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (patch) => onStyle(patch);
  const row = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 };
  const toggle = (label, value, onPick) => (
    <button onClick={() => { const next = !value; onPick(next); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 11.5, color: value ? 'var(--blue)' : 'var(--muted)', padding: '3px 0' }}>
      <span>{label}</span><span style={{ fontSize: 11 }}>{value ? '●' : '○'}</span>
    </button>
  );
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
      {zone && <>
        <div style={{ ...row, marginTop: 10 }}>
          <span className="dim" style={{ width: 62 }}>Opacity</span>
          <input type="range" min={0.06} max={0.6} step={0.02} value={opacity} onChange={(e) => { const value = Number(e.target.value); setOpacity(value); pick({ opacity: value }); }} style={{ flex: 1, accentColor: '#4d7cfe' }} />
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          {toggle('Extend Left', extendLeft, (v) => { setExtendLeft(v); pick({ extendLeft: v }); })}
          {toggle('Extend Right', extendRight, (v) => { setExtendRight(v); pick({ extendRight: v }); })}
          {toggle('Show Name', showLabel, (v) => { setShowLabel(v); pick({ showLabel: v }); })}
          {toggle('Show Price', showPrice, (v) => { setShowPrice(v); pick({ showPrice: v }); })}
        </div>
      </>}
      {channel && <>
        <div style={{ ...row, marginTop: 10 }}>
          <span className="dim" style={{ width: 62 }}>Opacity</span>
          <input type="range" min={0.02} max={0.5} step={0.02} value={opacity} onChange={(e) => { const value = Number(e.target.value); setOpacity(value); pick({ opacity: value }); }} style={{ flex: 1, accentColor: '#4d7cfe' }} />
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          {toggle('Extend Left', extendLeft, (v) => { setExtendLeft(v); pick({ extendLeft: v }); })}
          {toggle('Extend Right', extendRight, (v) => { setExtendRight(v); pick({ extendRight: v }); })}
          {toggle('Dashed', dash, (v) => { setDash(v); pick({ dash: v }); })}
          {toggle('Arrows', arrow, (v) => { setArrow(v); pick({ arrow: v }); })}
        </div>
      </>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button onClick={() => { const next = !locked; setLocked(next); onLockToggle(next); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: locked ? 'var(--blue)' : 'var(--muted)' }}>
          {locked ? <Lock size={13} /> : <LockOpen size={13} />}{locked ? 'Locked' : 'Unlocked'}
        </button>
        <span className="dim" style={{ fontSize: 11 }}>dbl-click again to close</span>
      </div>
    </div>
  );
}
