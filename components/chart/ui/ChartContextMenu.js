'use client';
import { Settings2, Copy, ClipboardPaste, Trash2, Lock, LockOpen, EyeOff, ArrowUpToLine, ArrowDownToLine, Eraser, MoveHorizontal, Tag, BadgeDollarSign, MousePointer2, Plus, Minus, Spline, FlipHorizontal2, Percent, Rows3, Magnet, ArrowUp, ArrowDown } from 'lucide-react';

// TradingView-style object context menu. Rendered inside the chart wrapper at
// the right-click position; actions dispatch through ChartCanvas which owns
// the interaction instance. Position is clamped to the chart bounds so the
// menu never spills out of the canvas. Zone drawings get extra toggles for
// band extension and label visibility; channels for band extension, dash
// and arrows; stroke drawings for control-point editing; position drawings
// for direction flipping and label visibility; text tools for auto-size
// reset and candle snapping.
export default function ChartContextMenu({ x, y, id, locked, hidden, zone = null, channel = null, stroke = null, position = null, text = null, hasClipboard, bounds, onAction, onClose }) {
  const rows = 9 + (zone ? 4 : 0) + (channel ? 4 : 0) + (stroke ? 5 : 0) + (position ? 3 : 0) + (text ? 2 : 0);
  const height = rows * 34 + 14;
  const left = Math.max(4, Math.min(x, (bounds?.width || 800) - 184 - 4));
  const top = Math.max(4, Math.min(y, (bounds?.height || 440) - height - 4));
  const Item = ({ icon: Icon, label, danger = false, disabled = false, checked = false, action }) => (
    <button
      disabled={disabled}
      onClick={() => { onClose(); onAction(action); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
        padding: '8px 12px', fontSize: 12, borderBottom: '1px solid var(--line)',
        color: disabled ? 'var(--dim)' : danger ? 'var(--red)' : 'var(--text)',
        background: 'transparent', opacity: disabled ? .5 : 1,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <Icon size={13} />
      <span style={{ flex: 1 }}>{label}</span>
      {checked && <span style={{ fontSize: 11, color: 'var(--blue, #4d7cfe)' }}>●</span>}
    </button>
  );
  return (
    <div style={{ position: 'absolute', left, top, width: 184, zIndex: 120, background: 'var(--card2)', border: '1px solid var(--line2)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {id ? <>
        <Item icon={Settings2} label="Properties…" action="properties" />
        <Item icon={Copy} label="Duplicate" action="duplicate" />
        <Item icon={Copy} label="Copy" action="copy" />
        <Item icon={Trash2} label="Delete" danger action="delete" />
        <Item icon={locked ? LockOpen : Lock} label={locked ? 'Unlock' : 'Lock'} action="lock" />
        <Item icon={EyeOff} label="Hide" action="hide" />
        <Item icon={ArrowUpToLine} label="Bring to Front" action="front" />
        <Item icon={ArrowUp} label="Bring Forward" action="forward" />
        <Item icon={ArrowDown} label="Send Backward" action="backward" />
        <Item icon={ArrowDownToLine} label="Send to Back" action="back" />
        {zone && <>
          <Item icon={MoveHorizontal} label="Extend Left" checked={zone.extendLeft !== false} action="zoneExtendLeft" />
          <Item icon={MoveHorizontal} label="Extend Right" checked={zone.extendRight !== false} action="zoneExtendRight" />
          <Item icon={Tag} label="Show Name" checked={zone.showLabel !== false} action="zoneShowLabel" />
          <Item icon={BadgeDollarSign} label="Show Price" checked={zone.showPrice !== false} action="zoneShowPrice" />
        </>}
        {channel && <>
          <Item icon={MoveHorizontal} label="Extend Left" checked={channel.extendLeft !== false} action="zoneExtendLeft" />
          <Item icon={MoveHorizontal} label="Extend Right" checked={channel.extendRight !== false} action="zoneExtendRight" />
          <Item icon={Eraser} label="Dashed" checked={channel.dash} action="channelDash" />
          <Item icon={ArrowUpToLine} label="Arrows" checked={channel.arrow} action="channelArrow" />
        </>}
        {stroke && <>
          <Item icon={MousePointer2} label={stroke.editing ? 'Exit Point Edit' : 'Edit Points'} action="editPoints" />
          <Item icon={Plus} label="Insert Anchor" action="pointInsert" />
          <Item icon={Minus} label="Delete Anchor" disabled={stroke.points <= 2} action="pointDelete" />
          <Item icon={Spline} label="Smooth Point" action="pointSmooth" />
          <Item icon={Spline} label="Sharp Point" action="pointSharp" />
        </>}
        {position && <>
          <Item icon={FlipHorizontal2} label="Flip Direction" action="positionFlip" />
          <Item icon={Tag} label="Show Labels" checked={position.showLabels !== false} action="positionShowLabels" />
          <Item icon={Percent} label="Show R:R" checked={position.showRR !== false} action="positionShowRR" />
        </>}
        {text && <>
          <Item icon={Rows3} label="Reset Auto Size" disabled={text.autoSize !== false} action="textAutoSizeReset" />
          <Item icon={Magnet} label="Snap to Candle" checked={text.snapToCandle !== false} action="textToggleSnap" />
        </>}
      </> : <>
        <Item icon={ClipboardPaste} label="Paste" disabled={!hasClipboard} action="paste" />
        <Item icon={Eraser} label="Clear drawings" danger action="clear" />
      </>}
    </div>
  );
}
