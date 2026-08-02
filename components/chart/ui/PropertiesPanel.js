'use client';
import { useEffect, useState } from 'react';
import { X, Lock, LockOpen, ArrowUp, ArrowDown, Plus, RotateCcw } from 'lucide-react';
import { drawingLabelFor, isZoneType, isChannelType, isFibType, zoneColorFor } from '../drawing/DrawingDefinitions';
import { fibLevelManager } from '../drawing/FibLevelManager';

const COLORS = ['#f5b93e', '#4d7cfe', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#f8fafc'];
const WIDTHS = [1, 1.5, 2, 3];

// TradingView-style properties card, opened by double-clicking a drawing.
// Every change is applied through the interaction (one undoable history
// delta per change). Local state mirrors the drawing so the panel stays
// responsive while the canvas updates. Zone drawings get fill opacity and
// band-extension controls; channels get band opacity, extension, dash and
// arrow controls; Fibonacci drawings get a full level editor (visibility,
// colors, custom ratios, reordering, label format and position).
export default function PropertiesPanel({ drawing, onStyle, onFib, onLockToggle, onClose }) {
  const zone = isZoneType(drawing.drawingType);
  const channel = isChannelType(drawing.drawingType);
  const fib = isFibType(drawing.drawingType);
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
  const [levels, setLevels] = useState(fibLevelManager.levelsFor(drawing));
  const [labelFormat, setLabelFormat] = useState(drawing.fib?.label?.format || 'both');
  const [labelPosition, setLabelPosition] = useState(drawing.fib?.label?.position || 'auto');
  const [customValue, setCustomValue] = useState('');
  useEffect(() => { setColor(drawing.style?.color || (isZoneType(drawing.drawingType) ? zoneColorFor(drawing.drawingType) : '#f5b93e')); setLineWidth(drawing.style?.lineWidth || 1.5); setOpacity(drawing.style?.opacity ?? 0.22); setExtendLeft(drawing.style?.extendLeft !== false); setExtendRight(drawing.style?.extendRight !== false); setShowLabel(drawing.style?.showLabel !== false); setShowPrice(drawing.style?.showPrice !== false); setDash(Boolean(drawing.style?.dash)); setArrow(Boolean(drawing.style?.arrow)); setLocked(Boolean(drawing.locked)); setLevels(fibLevelManager.levelsFor(drawing)); setLabelFormat(drawing.fib?.label?.format || 'both'); setLabelPosition(drawing.fib?.label?.position || 'auto'); setCustomValue(''); }, [drawing.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (patch) => onStyle(patch);
  const fibPatch = (nextDrawing) => onFib && onFib({ levels: nextDrawing.fib.levels });
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
      {fib && <>
        <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          {levels.map((level, index) => (
            <div key={level.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <button onClick={() => { const next = fibLevelManager.toggle(drawing, level.value); setLevels(next.fib.levels); fibPatch(next); }} style={{ color: level.enabled ? 'var(--blue)' : 'var(--muted)' }}>{level.enabled ? '●' : '○'}</button>
              <button onClick={() => { const next = fibLevelManager.remove(drawing, level.value); setLevels(next.fib.levels); fibPatch(next); }} style={{ color: 'var(--muted)', fontSize: 11 }}>✕</button>
              <input type="color" value={level.color} onChange={(e) => { const next = fibLevelManager.setColor(drawing, level.value, e.target.value); setLevels(next.fib.levels); fibPatch(next); }} style={{ width: 16, height: 16, border: 'none', padding: 0, background: 'transparent' }} />
              <span style={{ fontSize: 11, color: level.enabled ? 'var(--text)' : 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{level.label}</span>
              <button onClick={() => { const next = fibLevelManager.move(drawing, index, index - 1); setLevels(next.fib.levels); fibPatch(next); }} disabled={index === 0} style={{ color: 'var(--muted)' }}><ArrowUp size={11} /></button>
              <button onClick={() => { const next = fibLevelManager.move(drawing, index, index + 1); setLevels(next.fib.levels); fibPatch(next); }} disabled={index === levels.length - 1} style={{ color: 'var(--muted)' }}><ArrowDown size={11} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          <input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Ratio (0.886)" style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} />
          <button onClick={() => { const next = fibLevelManager.add(drawing, customValue); if (next !== drawing) { setLevels(next.fib.levels); setCustomValue(''); fibPatch(next); } }} style={{ display: 'grid', placeItems: 'center', color: 'var(--blue)', border: '1px solid var(--line2)', borderRadius: 6, width: 24 }}><Plus size={12} /></button>
          <button onClick={() => { const next = fibLevelManager.reset(drawing); setLevels(next.fib.levels); fibPatch(next); }} title="Reset levels" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 6, width: 24 }}><RotateCcw size={12} /></button>
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          <div style={{ ...row, marginBottom: 4 }}>
            <span className="dim" style={{ width: 62 }}>Label</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['percent', '%'], ['price', '₹'], ['both', '%₹']].map(([format, short]) => (
                <button key={format} onClick={() => { setLabelFormat(format); onFib({ label: { ...(drawing.fib?.label || {}), format } }); }} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--line2)', color: labelFormat === format ? 'var(--blue)' : 'var(--muted)', background: labelFormat === format ? 'rgba(77,124,254,.15)' : 'transparent' }}>{short}</button>
              ))}
            </div>
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Pos.</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['auto', 'Auto'], ['left', 'L'], ['right', 'R'], ['center', 'C']].map(([position, short]) => (
                <button key={position} onClick={() => { setLabelPosition(position); onFib({ label: { ...(drawing.fib?.label || {}), position } }); }} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--line2)', color: labelPosition === position ? 'var(--blue)' : 'var(--muted)', background: labelPosition === position ? 'rgba(77,124,254,.15)' : 'transparent' }}>{short}</button>
              ))}
            </div>
          </div>
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
