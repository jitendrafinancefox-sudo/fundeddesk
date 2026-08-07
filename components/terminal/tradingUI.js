'use client';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Shared formatting + visual primitives for the institutional trade widgets.
// Follows the terminal's light TradingView-style palette.

export const TRADING_PALETTE = {
  blue: '#2962ff',
  up: '#26a69a',
  down: '#ef5350',
  text: '#222222',
  muted: '#787b86',
  dim: '#b2b5be',
  border: '#e0e3eb',
  bg: '#ffffff',
  bgAlt: '#f8f9fa',
};

export const th = {
  textAlign: 'left',
  padding: '6px 10px',
  fontWeight: 600,
  fontSize: 11,
  color: '#787b86',
  borderBottom: '1px solid #e0e3eb',
  background: '#f8f9fa',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
};

export const td = {
  padding: '6px 10px',
  borderBottom: '1px solid #e0e3eb',
  fontSize: 11,
  fontWeight: 500,
  color: '#222222',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
};

export const fmtNum = (v, d = 2) => v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtQty = (v) => v == null ? '—' : Number(v).toLocaleString('en-IN');

export function Pnl({ value, digits = 0, prefix = '' }) {
  if (value == null) return <span style={{ color: '#787b86' }}>—</span>;
  const positive = value >= 0;
  return (
    <span style={{ color: positive ? '#26a69a' : '#ef5350', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
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
      color: buy ? '#26a69a' : '#ef5350',
      letterSpacing: '0.02em',
    }}>
      {buy ? 'BUY' : 'SELL'}
    </span>
  );
}

export function DirIcon({ up }) {
  return up
    ? <ArrowUpRight size={11} color="#26a69a" style={{ verticalAlign: '-2px' }} />
    : <ArrowDownRight size={11} color="#ef5350" style={{ verticalAlign: '-2px' }} />;
}

export function StatusBadge({ status, reason }) {
  const map = {
    pending: { bg: 'rgba(242,153,74,0.14)', fg: '#f2994a', label: 'Pending' },
    executed: { bg: 'rgba(41,98,255,0.1)', fg: '#2962ff', label: 'Executed' },
    completed: { bg: 'rgba(38,166,154,0.14)', fg: '#26a69a', label: 'Completed' },
    cancelled: { bg: 'rgba(120,123,134,0.12)', fg: '#787b86', label: 'Cancelled' },
    rejected: { bg: 'rgba(239,83,80,0.14)', fg: '#ef5350', label: 'Rejected' },
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
  color: '#2962ff',
  fontFamily: 'Inter, sans-serif',
};

export const dangerBtn = {
  ...actionBtn,
  background: 'rgba(239,83,80,0.08)',
  color: '#ef5350',
};

export const ghostBtn = {
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  border: '1px solid #e0e3eb',
  cursor: 'pointer',
  background: '#ffffff',
  color: '#787b86',
  fontFamily: 'Inter, sans-serif',
};

export const field = {
  padding: '4px 8px',
  border: '1px solid #e0e3eb',
  borderRadius: 5,
  fontSize: 11,
  fontFamily: 'Inter, sans-serif',
  color: '#222222',
  outline: 'none',
  background: '#ffffff',
  width: 90,
  fontVariantNumeric: 'tabular-nums',
};

export const inputNum = { ...field, textAlign: 'right' };

export function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: 26, textAlign: 'center', color: '#787b86', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
      {icon ? <div style={{ opacity: 0.5, marginBottom: 6 }}>{icon}</div> : null}
      {text}
    </div>
  );
}