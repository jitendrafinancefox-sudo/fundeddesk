'use client';

// Pure math helpers shared by every coordinate module. No state, no canvas —
// these are the building blocks that keep conversions consistent everywhere.

export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const toFinite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

// Half-pixel snapping for 1px hairlines: a line drawn on an integer x renders
// blurry, on x + 0.5 it renders crisp.
export const pixelSnap = (value) => Math.round(value) + 0.5;

// "Nice" tick step: 1/2/2.5/5 × 10^n, the TradingView price-scale convention.
export function niceStep(raw) {
  const n = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-12)));
  for (const multiplier of [1, 2, 2.5, 5, 10]) {
    const step = multiplier * n;
    if (step >= raw) return step;
  }
  return 10 * n;
}

// "Nice" time tick step in seconds, chosen from human-friendly intervals
// (1s → 5m → 1h → 1d → 1w …). Used by the time axis to pick label spacing.
const TIME_STEPS = [
  1, 2, 5, 10, 15, 30,
  60, 120, 300, 600, 900, 1800, 3600,
  7200, 14400, 21600, 43200, 86400,
  172800, 259200, 604800, 1209600, 2592000,
];
export function niceTimeStep(raw) {
  for (const step of TIME_STEPS) if (step >= raw) return step;
  return 2592000 * Math.ceil(raw / 2592000);
}

// Price label with step-aware decimals: sub-unit steps show more precision,
// larger steps stay clean (Indian numbering: lakh-style grouping).
export function fmtPrice(price, step = 1) {
  const decimals = step < 1 ? Math.min(4, Math.max(0, -Math.floor(Math.log10(step)))) : 2;
  return price.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Time label that adapts to the visible span: intraday shows HH:MM, wider
// ranges fall back to date-only or month+year labels.
export function timeLabel(time, spanSeconds) {
  const date = new Date(time * 1000);
  if (spanSeconds > 90 * 86400) return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  if (spanSeconds > 20 * 3600) return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
