'use client';
import { useEffect, useState } from 'react';
import { X, Lock, LockOpen, ArrowUp, ArrowDown, Plus, RotateCcw, MousePointer2, FlipHorizontal2 } from 'lucide-react';
import { drawingLabelFor, isZoneType, isChannelType, isFibType, isStrokeType, isPositionType, isTextType, isLabelType, zoneColorFor, positionColorFor } from '../drawing/DrawingDefinitions';
import { FONT_FAMILIES } from '../drawing/FontManager';
import { fibLevelManager } from '../drawing/FibLevelManager';
import { riskCalculator, fmtPrice, fmtMoney, fmtPercent, fmtRR, fmtPips } from '../drawing/RiskCalculator';

const COLORS = ['#f5b93e', '#4d7cfe', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#f8fafc'];
const WIDTHS = [1, 1.5, 2, 3];

// TradingView-style properties card, opened by double-clicking a drawing.
// Every change is applied through the interaction (one undoable history
// delta per change). Local state mirrors the drawing so the panel stays
// responsive while the canvas updates. Zone drawings get fill opacity and
// band-extension controls; channels get band opacity, extension, dash and
// arrow controls; Fibonacci drawings get a full level editor (visibility,
// colors, custom ratios, reordering, label format and position).
export default function PropertiesPanel({ drawing, onStyle, onFib, onPosition, onText, onTextLive, onFlip, onLockToggle, onPointEdit, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const resolveThemeColor = (name, fallback) => {
    if (!mounted || typeof window === 'undefined' || !window.getComputedStyle) return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  };

  const zone = isZoneType(drawing.drawingType);
  const channel = isChannelType(drawing.drawingType);
  const fib = isFibType(drawing.drawingType);
  const stroke = isStrokeType(drawing.drawingType);
  const position = isPositionType(drawing.drawingType);
  const text = isTextType(drawing.drawingType);
  const label = isLabelType(drawing.drawingType);
  const baseColor = zone ? zoneColorFor(drawing.drawingType) : position ? positionColorFor(drawing.drawingType) : '#f5b93e';
  const [color, setColor] = useState(drawing.style?.color || baseColor);
  const [lineWidth, setLineWidth] = useState(drawing.style?.lineWidth || 1.5);
  const [opacity, setOpacity] = useState(drawing.style?.opacity ?? 0.22);
  const [extendLeft, setExtendLeft] = useState(drawing.style?.extendLeft !== false);
  const [extendRight, setExtendRight] = useState(drawing.style?.extendRight !== false);
  const [showLabel, setShowLabel] = useState(drawing.style?.showLabel !== false);
  const [showPrice, setShowPrice] = useState(drawing.style?.showPrice !== false);
  const [dash, setDash] = useState(Boolean(drawing.style?.dash));
  const [arrow, setArrow] = useState(Boolean(drawing.style?.arrow));
  const [taper, setTaper] = useState(drawing.brush?.taper !== false);
  const [smooth, setSmooth] = useState(drawing.brush?.smooth === false ? false : drawing.brush?.raw !== true);
  const [locked, setLocked] = useState(Boolean(drawing.locked));
  const [levels, setLevels] = useState(fibLevelManager.levelsFor(drawing));
  const [labelFormat, setLabelFormat] = useState(drawing.fib?.label?.format || 'both');
  const [labelPosition, setLabelPosition] = useState(drawing.fib?.label?.position || 'auto');
  const [customValue, setCustomValue] = useState('');
  const [lots, setLots] = useState(String(drawing.position?.lots ?? 1));
  const [account, setAccount] = useState(String(drawing.position?.account ?? 0));
  const [pipSize, setPipSize] = useState(String(drawing.position?.pipSize ?? 0.01));
  const [fixedRisk, setFixedRisk] = useState(drawing.position?.fixedRisk == null ? '' : String(drawing.position.fixedRisk));
  const [fixedReward, setFixedReward] = useState(drawing.position?.fixedReward == null ? '' : String(drawing.position.fixedReward));
  const [showLabels, setShowLabels] = useState(drawing.style?.showLabels !== false);
  const [showRR, setShowRR] = useState(drawing.style?.showRR !== false);
  const [showRisk, setShowRisk] = useState(drawing.style?.showRisk !== false);
  const [content, setContent] = useState(drawing.text?.content || '');
  const [fontFamily, setFontFamily] = useState(drawing.text?.font?.family || 'Inter');
  const [fontSize, setFontSize] = useState(drawing.text?.font?.size ?? 14);
  const [bold, setBold] = useState(Boolean(drawing.text?.font?.bold));
  const [italic, setItalic] = useState(Boolean(drawing.text?.font?.italic));
  const [underline, setUnderline] = useState(Boolean(drawing.text?.font?.underline));
  const [align, setAlign] = useState(drawing.text?.font?.align || 'left');
  const [letterSpacing, setLetterSpacing] = useState(drawing.text?.font?.letterSpacing ?? 0);
  const [lineHeight, setLineHeight] = useState(drawing.text?.font?.lineHeight ?? 1.4);
  const [padding, setPadding] = useState(drawing.text?.boxStyle?.padding ?? 10);
  const [radius, setRadius] = useState(drawing.text?.boxStyle?.radius ?? 8);
  const [background, setBackground] = useState(drawing.text?.boxStyle?.background || resolveThemeColor('--bg2', '#0A0C15'));
  const [border, setBorder] = useState(drawing.text?.boxStyle?.border || resolveThemeColor('--line2', 'rgba(255,255,255,.12)'));
  const [boxOpacity, setBoxOpacity] = useState(drawing.text?.boxStyle?.opacity ?? 1);
  const [autoSize, setAutoSize] = useState(drawing.text?.autoSize !== false);
  const [rotation, setRotation] = useState(Number(drawing.text?.rotation) || 0);
  const [side, setSide] = useState(drawing.text?.side || 'auto');
  const [snapToCandle, setSnapToCandle] = useState(drawing.text?.snapToCandle !== false);
  const calc = position ? riskCalculator(drawing) : null;
  useEffect(() => { setColor(drawing.style?.color || (isZoneType(drawing.drawingType) ? zoneColorFor(drawing.drawingType) : isPositionType(drawing.drawingType) ? positionColorFor(drawing.drawingType) : '#f5b93e')); setLineWidth(drawing.style?.lineWidth || 1.5); setOpacity(drawing.style?.opacity ?? 0.22); setExtendLeft(drawing.style?.extendLeft !== false); setExtendRight(drawing.style?.extendRight !== false); setShowLabel(drawing.style?.showLabel !== false); setShowPrice(drawing.style?.showPrice !== false); setDash(Boolean(drawing.style?.dash)); setArrow(Boolean(drawing.style?.arrow)); setTaper(drawing.brush?.taper !== false); setSmooth(drawing.brush?.smooth === false ? false : drawing.brush?.raw !== true); setLocked(Boolean(drawing.locked)); setLevels(fibLevelManager.levelsFor(drawing)); setLabelFormat(drawing.fib?.label?.format || 'both'); setLabelPosition(drawing.fib?.label?.position || 'auto'); setCustomValue(''); setLots(String(drawing.position?.lots ?? 1)); setAccount(String(drawing.position?.account ?? 0)); setPipSize(String(drawing.position?.pipSize ?? 0.01)); setFixedRisk(drawing.position?.fixedRisk == null ? '' : String(drawing.position.fixedRisk)); setFixedReward(drawing.position?.fixedReward == null ? '' : String(drawing.position.fixedReward)); setShowLabels(drawing.style?.showLabels !== false); setShowRR(drawing.style?.showRR !== false); setShowRisk(drawing.style?.showRisk !== false); setContent(drawing.text?.content || ''); setFontFamily(drawing.text?.font?.family || 'Inter'); setFontSize(drawing.text?.font?.size ?? 14); setBold(Boolean(drawing.text?.font?.bold)); setItalic(Boolean(drawing.text?.font?.italic)); setUnderline(Boolean(drawing.text?.font?.underline)); setAlign(drawing.text?.font?.align || 'left'); setLetterSpacing(drawing.text?.font?.letterSpacing ?? 0); setLineHeight(drawing.text?.font?.lineHeight ?? 1.4); setPadding(drawing.text?.boxStyle?.padding ?? 10); setRadius(drawing.text?.boxStyle?.radius ?? 8); setBackground(drawing.text?.boxStyle?.background || resolveThemeColor('--bg2', '#0A0C15'));; setBorder(drawing.text?.boxStyle?.border || resolveThemeColor('--line2', 'rgba(255,255,255,.12)'));; setBoxOpacity(drawing.text?.boxStyle?.opacity ?? 1); setAutoSize(drawing.text?.autoSize !== false); setRotation(Number(drawing.text?.rotation) || 0); setSide(drawing.text?.side || 'auto'); setSnapToCandle(drawing.text?.snapToCandle !== false); }, [drawing.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (patch) => onStyle(patch);
  const brushPatch = (patch) => onStyle({ brush: { ...(drawing.brush || {}), ...patch } });
  const fibPatch = (nextDrawing) => onFib && onFib({ levels: nextDrawing.fib.levels });
  const fontPatch = (patch) => onText && onText({ font: { ...(drawing.text?.font || {}), ...patch } });
  const boxPatch = (patch) => onText && onText({ boxStyle: { ...(drawing.text?.boxStyle || {}), ...patch } });
  const row = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 };
  const toggle = (label, value, onPick) => (
    <button onClick={() => { const next = !value; onPick(next); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 11, color: value ? 'var(--blue)' : 'var(--muted)', padding: '3px 0' }}>
      <span>{label}</span><span style={{ fontSize: 11 }}>{value ? '●' : '○'}</span>
    </button>
  );
  return (
    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 110, width: 210, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: 12, color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <b style={{ fontSize: 13 }}>{drawingLabelFor(drawing.drawingType)}</b>
        <button onClick={onClose} style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
      </div>
      <div style={row}>
        <span className="dim" style={{ width: 62 }}>Color</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {COLORS.map((c) => <button key={c} title={c} onClick={() => { setColor(c); pick({ color: c }); }} style={{ width: 16, height: 16, borderRadius: 4, background: c, outline: color === c ? '2px solid var(--text)' : 'none', outlineOffset: 1 }} />)}
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
          <input type="range" min={0.06} max={0.6} step={0.02} value={opacity} onChange={(e) => { const value = Number(e.target.value); setOpacity(value); pick({ opacity: value }); }} style={{ flex: 1, accentColor: 'var(--accent)' }} />
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
          <input type="range" min={0.02} max={0.5} step={0.02} value={opacity} onChange={(e) => { const value = Number(e.target.value); setOpacity(value); pick({ opacity: value }); }} style={{ flex: 1, accentColor: 'var(--accent)' }} />
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
                <button key={format} onClick={() => { setLabelFormat(format); onFib({ label: { ...(drawing.fib?.label || {}), format } }); }} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--line2)', color: labelFormat === format ? 'var(--blue)' : 'var(--muted)', background: labelFormat === format ? 'rgba(77,124,254,.15)' : 'transparent' }}>{short}</button>
              ))}
            </div>
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Pos.</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['auto', 'Auto'], ['left', 'L'], ['right', 'R'], ['center', 'C']].map(([position, short]) => (
                <button key={position} onClick={() => { setLabelPosition(position); onFib({ label: { ...(drawing.fib?.label || {}), position } }); }} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--line2)', color: labelPosition === position ? 'var(--blue)' : 'var(--muted)', background: labelPosition === position ? 'rgba(77,124,254,.15)' : 'transparent' }}>{short}</button>
              ))}
            </div>
          </div>
        </div>
      </>}
      {position && <>
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
          <div style={row}><span className="dim" style={{ width: 62 }}>Direction</span><span style={{ color: calc?.isLong ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{calc ? (calc.isLong ? 'LONG ▲' : 'SHORT ▼') : '—'}</span><span style={{ flex: 1 }} /><button onClick={() => { onFlip && onFlip(); }} title="Flip direction" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--blue)', padding: '2px 6px', border: '1px solid var(--line2)', borderRadius: 4 }}><FlipHorizontal2 size={11} />Flip</button></div>
          <div style={row}><span className="dim" style={{ width: 62 }}>Entry / SL / TP</span><span>{calc ? `${fmtPrice(calc.entry)} / ${fmtPrice(calc.sl)} / ${fmtPrice(calc.tp)}` : '—'}</span></div>
          <div style={row}><span className="dim" style={{ width: 62 }}>Risk</span><span style={{ color: 'var(--red)' }}>{calc ? fmtMoney(calc.riskAmount) : '—'}</span><span className="dim" style={{ fontSize: 10 }}>{calc ? fmtPercent(calc.riskPercent) : ''}</span></div>
          <div style={row}><span className="dim" style={{ width: 62 }}>Reward</span><span style={{ color: 'var(--green)' }}>{calc ? fmtMoney(calc.rewardAmount) : '—'}</span><span className="dim" style={{ fontSize: 10 }}>{calc ? fmtPercent(calc.rewardPercent) : ''}</span></div>
          <div style={row}><span className="dim" style={{ width: 62 }}>R:R</span><span style={{ color: 'var(--blue)', fontWeight: 600 }}>{calc ? fmtRR(calc.rr) : '—'}</span></div>
          <div style={row}><span className="dim" style={{ width: 62 }}>Pips</span><span>{calc ? `${fmtPips(calc.riskPips)} risk / ${fmtPips(calc.rewardPips)} reward` : '—'}</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 8 }}>
          {[['Lots', lots, setLots, 'lots'], ['Account (₹)', account, setAccount, 'account'], ['Pip size', pipSize, setPipSize, 'pipSize'], ['Fixed risk (₹)', fixedRisk, setFixedRisk, 'fixedRisk']].map(([label, value, setValue, key]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: 'var(--dim)' }}>
              {label}
              <input
                type="number" inputMode="decimal" value={value}
                onChange={(e) => { setValue(e.target.value); const parsed = Number(e.target.value); if (Number.isFinite(parsed) && onPosition) onPosition({ [key]: parsed }); }}
                onBlur={() => { if (value === '') setValue(String(drawing.position?.[key] ?? (key === 'lots' ? 1 : 0))); }}
                style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)', width: '100%' }}
              />
            </label>
          ))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10, color: 'var(--dim)' }}>
            Fixed reward (₹)
            <input
              type="number" inputMode="decimal" value={fixedReward}
              onChange={(e) => { setFixedReward(e.target.value); const parsed = Number(e.target.value); if (Number.isFinite(parsed) && onPosition) onPosition({ fixedReward: parsed }); }}
              onBlur={() => { if (fixedReward === '') setFixedReward(''); }}
              style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)', width: '100%' }}
            />
          </label>
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          {toggle('Show Labels', showLabels, (v) => { setShowLabels(v); pick({ showLabels: v }); })}
          {toggle('Show R:R', showRR, (v) => { setShowRR(v); pick({ showRR: v }); })}
          {toggle('Show Risk Tag', showRisk, (v) => { setShowRisk(v); pick({ showRisk: v }); })}
        </div>
      </>}
      {text && <>
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); onTextLive && onTextLive({ content: e.target.value }); }}
            onBlur={() => onText && onText({ content })}
            rows={3}
            placeholder="Text…"
            style={{ background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px', fontSize: 11, color: 'var(--text)', resize: 'none', width: '100%' }}
          />
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Font</span>
            <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); fontPatch({ family: e.target.value }); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 4px', fontSize: 11, color: 'var(--text)' }}>
              {FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
            </select>
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Size</span>
            <input type="number" min={8} max={72} value={fontSize} onChange={(e) => { const value = Number(e.target.value); setFontSize(value); if (Number.isFinite(value)) fontPatch({ size: value }); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} />
            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={() => { const next = !bold; setBold(next); fontPatch({ bold: next }); }} title="Bold" style={{ minWidth: 20, fontWeight: 700, color: bold ? 'var(--blue)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 5 }}>B</button>
              <button onClick={() => { const next = !italic; setItalic(next); fontPatch({ italic: next }); }} title="Italic" style={{ minWidth: 20, fontStyle: 'italic', color: italic ? 'var(--blue)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 5 }}>I</button>
              <button onClick={() => { const next = !underline; setUnderline(next); fontPatch({ underline: next }); }} title="Underline" style={{ minWidth: 20, textDecoration: 'underline', color: underline ? 'var(--blue)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 5 }}>U</button>
            </div>
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Align</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['left', 'center', 'right'].map((a) => <button key={a} onClick={() => { setAlign(a); fontPatch({ align: a }); }} title={a} style={{ minWidth: 20, fontSize: 10, color: align === a ? 'var(--blue)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 5, padding: '1px 5px' }}>{a[0].toUpperCase()}</button>)}
            </div>
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Spacing</span>
            <input type="range" min={-2} max={20} step={1} value={letterSpacing} onChange={(e) => { const value = Number(e.target.value); setLetterSpacing(value); fontPatch({ letterSpacing: value }); }} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>L-height</span>
            <input type="range" min={1} max={3} step={0.1} value={lineHeight} onChange={(e) => { const value = Number(e.target.value); setLineHeight(value); fontPatch({ lineHeight: value }); }} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Pointer</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['auto', 'left', 'right', 'top', 'bottom'].map((s) => <button key={s} onClick={() => { setSide(s); onText && onText({ side: s }); }} title={s} style={{ minWidth: 20, fontSize: 10, color: side === s ? 'var(--blue)' : 'var(--muted)', border: '1px solid var(--line2)', borderRadius: 5, padding: '1px 5px' }}>{s === 'auto' ? 'A' : s[0].toUpperCase()}</button>)}
            </div>
          </div>
          {!label && <div style={row}>
            <span className="dim" style={{ width: 62 }}>Rotate</span>
            <input type="number" min={0} max={359} value={rotation} onChange={(e) => { const value = Number(e.target.value); setRotation(value); if (Number.isFinite(value)) onText && onText({ rotation: value }); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} />
          </div>}
          {!label && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="dim" style={{ width: 62, fontSize: 11 }}>Padding</span>
            <input type="number" min={0} max={60} value={padding} onChange={(e) => { const value = Number(e.target.value); setPadding(value); if (Number.isFinite(value)) boxPatch({ padding: value }); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} />
            <span className="dim" style={{ width: 54, fontSize: 11 }}>Radius</span>
            <input type="number" min={0} max={60} value={radius} onChange={(e) => { const value = Number(e.target.value); setRadius(value); if (Number.isFinite(value)) boxPatch({ radius: value }); }} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} />
          </div>}
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Opacity</span>
            <input type="range" min={0.05} max={1} step={0.05} value={boxOpacity} onChange={(e) => { const value = Number(e.target.value); setBoxOpacity(value); boxPatch({ opacity: value }); }} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </div>
          <div style={row}>
            <span className="dim" style={{ width: 62 }}>Fill</span>
            <input type="color" value={background} onChange={(e) => { setBackground(e.target.value); boxPatch({ background: e.target.value }); }} style={{ width: 22, height: 20, border: 'none', padding: 0, background: 'transparent' }} />
            <span className="dim" style={{ width: 48 }}>Border</span>
            <input type="color" value={border} onChange={(e) => { setBorder(e.target.value); boxPatch({ border: e.target.value }); }} style={{ width: 22, height: 20, border: 'none', padding: 0, background: 'transparent' }} />
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            {toggle('Auto size', autoSize, (v) => { setAutoSize(v); onText && onText({ autoSize: v }); })}
            {toggle('Snap to candle', snapToCandle, (v) => { setSnapToCandle(v); onText && onText({ snapToCandle: v }); })}
          </div>
        </div>
      </>}
      {stroke && <>
        <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 6 }}>
          {toggle('Tapered ends', taper, (v) => { setTaper(v); brushPatch({ taper: v }); })}
          {toggle('Smooth path', smooth, (v) => { setSmooth(v); brushPatch({ smooth: v ? undefined : false, raw: v ? false : true }); })}
          <button onClick={() => { onClose(); onPointEdit && onPointEdit(drawing.id); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', fontSize: 11, color: 'var(--blue)', padding: '3px 0' }}>
            <MousePointer2 size={12} />Edit control points
          </button>
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
