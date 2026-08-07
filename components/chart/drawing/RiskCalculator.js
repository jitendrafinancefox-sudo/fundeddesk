'use client';

// Pure risk/reward math for the position-tool family. No viewport or canvas
// dependencies: every function works on the drawing's anchor prices and the
// user-supplied position payload { lots, account, pipSize, fixedRisk,
// fixedReward }. Derived numbers (RR, amounts, percents, pips) are never
// persisted — they are recomputed at render time so edits and drags always
// stay consistent.

export const POSITION_DEFAULTS = { lots: 1, account: 0, currency: 'INR', pipSize: 0.01 };

const finiteOr = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

// Anchor order is [entry, stopLoss, takeProfit]. Direction is derived from
// placement: TP above entry means a long, below means a short. The tool type
// only sets the default color; users can place either way.
export function positionDirection(drawing) {
  const [entry, , tp] = drawing.anchorPoints;
  if (!entry || !tp) return 'long';
  return tp.price >= entry.price ? 'long' : 'short';
}

// Core calculator: distances, R:R, and money math from the position payload.
// Returns null when anchors are missing or degenerate.
export function riskCalculator(drawing) {
  const [entryA, slA, tpA] = drawing.anchorPoints || [];
  if (!entryA || !slA || !tpA) return null;
  const entry = entryA.price; const sl = slA.price; const tp = tpA.price;
  if (![entry, sl, tp].every(Number.isFinite)) return null;
  const isLong = tp >= entry;
  const riskDistance = Math.abs(entry - sl);
  const rewardDistance = Math.abs(tp - entry);
  const p = { ...POSITION_DEFAULTS, ...(drawing.position || {}) };
  const lots = Math.max(0, finiteOr(p.lots, POSITION_DEFAULTS.lots));
  const account = Math.max(0, finiteOr(p.account, POSITION_DEFAULTS.account));
  const pipSize = finiteOr(p.pipSize, POSITION_DEFAULTS.pipSize);
  const riskAmount = finiteOr(p.fixedRisk, riskDistance * lots);
  const rewardAmount = finiteOr(p.fixedReward, rewardDistance * lots);
  return {
    entry, sl, tp, isLong,
    riskDistance, rewardDistance,
    rr: riskDistance > 0 ? rewardDistance / riskDistance : 0,
    lots, account, pipSize,
    riskAmount: Math.max(0, riskAmount), rewardAmount: Math.max(0, rewardAmount),
    riskPercent: account > 0 ? (riskAmount / account) * 100 : null,
    rewardPercent: account > 0 ? (rewardAmount / account) * 100 : null,
    riskPips: pipSize > 0 ? riskDistance / pipSize : null,
    rewardPips: pipSize > 0 ? rewardDistance / pipSize : null,
  };
}

export const fmtPrice = (price) => (Number.isFinite(price) ? price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
export const fmtMoney = (amount) => (Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—');
export const fmtPercent = (value) => (value == null ? '—' : `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`);
export const fmtRR = (value) => (Number.isFinite(value) ? `R:R ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : 'R:R —');
export const fmtPips = (value) => (value == null ? '—' : `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} pips`);
