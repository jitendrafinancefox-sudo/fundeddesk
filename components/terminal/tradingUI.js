'use client';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Shared formatting + visual primitives for the institutional trade widgets.
// Follows the terminal's light TradingView-style palette.

export const TRADING_PALETTE = {
  blue: 'var(--blue)',
  up: 'var(--green)',
  down: 'var(--red)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  dim: 'var(--dim)',
  border: 'var(--border)',
  bg: 'var(--surface)',
  bgAlt: 'var(--bg2)',
};

// Row/header spacing (Phase 21C) — widened from '6px 10px' so the bottom
// dock's tables (Positions/Orders/History/etc, all sharing this module)
// have room to breathe once the dock itself has more vertical space; this
// is presentation-only, no data or column changes.
export const th = {
  textAlign: 'left',
  padding: '9px 14px',
  fontWeight: 600,
  fontSize: 11,
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg2)',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
  letterSpacing: '0.02em',
};

export const td = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
  fontSize: 11.5,
  fontWeight: 500,
  color: 'var(--text)',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
};

export const fmtNum = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtQty = (v) => v == null ? '—' : Number(v).toLocaleString('en-IN');

export function Pnl({ value, digits = 0, prefix = '' }) {
  if (value == null) return <span style={{ color: 'var(--muted)' }}>—</span>;
  const positive = value >= 0;
  return (
    <span style={{ color: positive ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
      {positive ? '+' : ''}{prefix}{fmtNum(value, digits)}
    </span>
  );
}

export function Side({ side }) {
  const buy = String(side).toUpperCase() === 'BUY';
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: buy ? 'rgba(38,166,154,0.14)' : 'rgba(239,83,80,0.14)',
      color: buy ? 'var(--green)' : 'var(--red)',
      letterSpacing: '0.02em',
    }}>
      {buy ? 'BUY' : 'SELL'}
    </span>
  );
}

export function DirIcon({ up }) {
  return up
    ? <ArrowUpRight size={11} color="var(--green)" style={{ verticalAlign: '-2px' }} />
    : <ArrowDownRight size={11} color="var(--red)" style={{ verticalAlign: '-2px' }} />;
}

export function StatusBadge({ status, reason }) {
  const map = {
    pending: { bg: 'rgba(242,153,74,0.14)', fg: 'var(--gold)', label: 'Pending' },
    executed: { bg: 'rgba(41,98,255,0.1)', fg: 'var(--blue)', label: 'Executed' },
    completed: { bg: 'rgba(38,166,154,0.14)', fg: 'var(--green)', label: 'Completed' },
    cancelled: { bg: 'rgba(120,123,134,0.12)', fg: 'var(--muted)', label: 'Cancelled' },
    rejected: { bg: 'rgba(239,83,80,0.14)', fg: 'var(--red)', label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span title={reason} style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: s.bg, color: s.fg, letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  );
}

export const actionBtn = {
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  background: 'rgba(41,98,255,0.08)',
  color: 'var(--blue)',
  fontFamily: 'Inter, sans-serif',
};

export const dangerBtn = {
  ...actionBtn,
  background: 'rgba(239,83,80,0.08)',
  color: 'var(--red)',
};

export const ghostBtn = {
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  border: '1px solid var(--border)',
  cursor: 'pointer',
  background: 'var(--bg2)',
  color: 'var(--muted)',
  fontFamily: 'Inter, sans-serif',
};

export const field = {
  padding: '4px 8px',
  border: '1px solid var(--border)',
  borderRadius: 5,
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  color: 'var(--text)',
  // No outline:'none' here (Phase 20 accessibility fix) — this is a plain
  // inline style object, not a CSS class, so there's no way to pair a
  // suppressed outline with a :focus-visible replacement without a larger
  // change; leaving the browser's native focus outline visible is the
  // smallest correct fix for keyboard-focus visibility on every field that
  // uses this shared style.
  background: 'var(--bg2)',
  width: 90,
  fontVariantNumeric: 'tabular-nums',
};

export const inputNum = { ...field, textAlign: 'right' };

export function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: 26, textAlign: 'center', color: 'var(--muted)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
      {icon ? <div style={{ opacity: 0.5, marginBottom: 6 }}>{icon}</div> : null}
      {text}
    </div>
  );
}