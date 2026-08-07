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
// (1s → 5m → 1h → 1d → 1w → 1M → 1Q → 1y). Used by the time axis to pick
// label spacing; beyond 3 years steps climb in whole years.
const TIME_STEPS = [
  1, 2, 5, 10, 15, 30,
  60, 120, 300, 600, 900, 1800, 3600,
  7200, 14400, 21600, 43200, 86400,
  172800, 259200, 604800, 1209600, 2592000,
  7776000, 15552000, 31536000,
];
export function niceTimeStep(raw) {
  for (const step of TIME_STEPS) if (step >= raw) return step;
  return 31536000 * Math.ceil(raw / 31536000);
}

// Smallest decimal count that represents multiples of `step` exactly:
// 100 → 0, 25 → 0, 2.5 → 1, 1 → 0, 0.5 → 1, 0.25 → 2, 0.05 → 2.
// Trial division (not log10) so non-power-of-ten steps stay exact.
function decimalsForStep(step) {
  let d = 0;
  while (d < 4 && Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) > 1e-9) d += 1;
  return d;
}

// Price label with step-aware decimals: axis ticks round to the step's exact
// precision (large steps → compact "24,500" instead of clipped "24,500.00"),
// while callers without a step (live/crosshair badges) keep 2 decimals.
export function fmtPrice(price, step = null) {
  const decimals = step == null ? 2 : decimalsForStep(step);
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
