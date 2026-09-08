/**
 * Canonical number / currency formatting for the portal dashboard.
 *
 * Indian grouping (lakh / crore) via the 'en-IN' locale. One source of truth so
 * KPI cards, tables, tooltips and chart labels all read consistently.
 *
 * These are PRESENTATION helpers only — they never alter the underlying value.
 * A null / undefined / non-finite input renders as an em dash, not a fake 0.
 */

const DASH = '—';

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * ₹ amount with Indian grouping.
 *   formatINR(1102483)            -> "₹11,02,483"
 *   formatINR(1102483, {decimals: 2}) -> "₹11,02,483.00"
 *   formatINR(-29196, {})         -> "-₹29,196"
 *   formatINR(1500, {sign: true}) -> "+₹1,500"
 */
export function formatINR(value, { decimals = 0, sign = false } = {}) {
  const n = toFiniteNumber(value);
  if (n === null) return DASH;
  const body = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const prefix = n < 0 ? '-₹' : sign && n > 0 ? '+₹' : '₹';
  return prefix + body;
}

/**
 * Compact ₹ for tight spaces (chart axes, dense chips).
 *   formatINRCompact(1102483)  -> "₹11.02L"
 *   formatINRCompact(12500000) -> "₹1.25Cr"
 */
export function formatINRCompact(value) {
  const n = toFiniteNumber(value);
  if (n === null) return DASH;
  const abs = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (abs >= 1e7) return `${s}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${s}₹${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${s}₹${(abs / 1e3).toFixed(1)}K`;
  return `${s}₹${Math.round(abs)}`;
}

/**
 * Percentage.
 *   formatPct(10.25)            -> "+10.25%"
 *   formatPct(-3.5)             -> "-3.50%"
 *   formatPct(100, {decimals: 1}) -> "+100.0%"
 *   formatPct(4.2, {sign: false}) -> "4.20%"
 */
export function formatPct(value, { decimals = 2, sign = true } = {}) {
  const n = toFiniteNumber(value);
  if (n === null) return DASH;
  const prefix = sign && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(decimals)}%`;
}

/** Plain integer/decimal count with Indian grouping. */
export function formatNumber(value, { decimals = 0 } = {}) {
  const n = toFiniteNumber(value);
  if (n === null) return DASH;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
