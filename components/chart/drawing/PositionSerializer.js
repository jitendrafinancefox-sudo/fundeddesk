'use client';
import { isPositionType } from './PositionGeometry';

// v6 payload: position-tool drawings carry a validated position object
// { lots, account, currency, pipSize, fixedRisk, fixedReward }. All numbers
// are coerced and clamped so a malformed file can never produce NaN renders;
// unknown keys are dropped.
const num = (value, fallback, min = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
};

export function sanitizePosition(drawing) {
  if (!isPositionType(drawing.drawingType)) return {};
  const position = drawing.position || {};
  const clean = {
    lots: num(position.lots, 1),
    account: num(position.account, 0),
    currency: typeof position.currency === 'string' && position.currency ? position.currency.slice(0, 8) : 'INR',
    pipSize: position.pipSize > 0 ? num(position.pipSize, 0.01, 0.000001) : 0.01,
  };
  if (typeof position.fixedRisk === 'number' && Number.isFinite(position.fixedRisk)) clean.fixedRisk = Math.max(0, position.fixedRisk);
  if (typeof position.fixedReward === 'number' && Number.isFinite(position.fixedReward)) clean.fixedReward = Math.max(0, position.fixedReward);
  return { position: clean };
}
