'use client';
import { Settings2, Copy, ClipboardPaste, Trash2, Lock, LockOpen, EyeOff, ArrowUpToLine, ArrowDownToLine, Eraser, MoveHorizontal, Tag, BadgeDollarSign } from 'lucide-react';

// TradingView-style object context menu. Rendered inside the chart wrapper at
// the right-click position; actions dispatch through ChartCanvas which owns
// the interaction instance. Position is clamped to the chart bounds so the
// menu never spills out of the canvas. Zone drawings get extra toggles for
// band extension and label visibility.
export default function ChartContextMenu({ x, y, id, locked, hidden, zone = null, hasClipboard, bounds, onAction, onClose }) {
  const rows = 7 + (zone ? 4 : 0);
  const height = rows * 34 + 14;
  const left = Math.max(4, Math.min(x, (bounds?.width || 800) - 184 - 4));
  const top = Math.max(4, Math.min(y, (bounds?.height || 440) - height - 4));
  const Item = ({ icon: Icon, label, danger = false, disabled = false, checked = false, action }) => (
    <button
      disabled={disabled}
      onClick={() => { onClose(); onAction(action); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
        padding: '8px 12px', fontSize: 12.5, borderBottom: '1px solid var(--line)',
        color: disabled ? 'var(--dim)' : danger ? 'var(--red)' : 'var(--text)',
        background: 'transparent', opacity: disabled ? .5 : 1,
      }}
    >
      <Icon size={13} />
      <span style={{ flex: 1 }}>{label}</span>
      {checked && <span style={{ fontSize: 11, color: 'var(--blue, #4d7cfe)' }}>●</span>}
    </button>
  );
  return (
    <div style={{ position: 'absolute', left, top, width: 184, zIndex: 120, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.5)', overflow: 'hidden' }}>
      {id ? <>
        <Item icon={Settings2} label="Properties…" action="properties" />
        <Item icon={Copy} label="Duplicate" action="duplicate" />
        <Item icon={Copy} label="Copy" action="copy" />
        <Item icon={Trash2} label="Delete" danger action="delete" />
        <Item icon={locked ? LockOpen : Lock} label={locked ? 'Unlock' : 'Lock'} action="lock" />
        <Item icon={EyeOff} label="Hide" action="hide" />
        <Item icon={ArrowUpToLine} label="Bring to Front" action="front" />
        <Item icon={ArrowDownToLine} label="Send to Back" action="back" />
        {zone && <>
          <Item icon={MoveHorizontal} label="Extend Left" checked={zone.extendLeft !== false} action="zoneExtendLeft" />
          <Item icon={MoveHorizontal} label="Extend Right" checked={zone.extendRight !== false} action="zoneExtendRight" />
          <Item icon={Tag} label="Show Name" checked={zone.showLabel !== false} action="zoneShowLabel" />
          <Item icon={BadgeDollarSign} label="Show Price" checked={zone.showPrice !== false} action="zoneShowPrice" />
        </>}
      </> : <>
        <Item icon={ClipboardPaste} label="Paste" disabled={!hasClipboard} action="paste" />
        <Item icon={Eraser} label="Clear drawings" danger action="clear" />
      </>}
    </div>
  );
}
