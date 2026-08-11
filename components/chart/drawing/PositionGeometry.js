'use client';
import { themeTokens } from '../engine/ThemeManager';

// Screen-space geometry for the position-tool family. Positions are zone-like
// drawings: entry/SL/TP are price bands that span the anchors' x-extent
// (bounded between the entry/SL/TP time range). Pure functions; the renderer
// and the hit tester both consume positionZones so they always agree on the
// bands.

export const POSITION_TYPES = ['longPosition', 'shortPosition', 'riskReward', 'fixedRisk', 'fixedReward', 'customPosition'];
export const isPositionType = (drawingType) => POSITION_TYPES.includes(drawingType);

export const positionColorFor = (drawingType) => {
  const t = themeTokens();
  return ({
    longPosition: t.green, shortPosition: t.red, riskReward: t.gold, fixedRisk: t.gold, fixedReward: t.accent, customPosition: t.accent,
  }[drawingType] || t.gold);
};

// Anchor order is [entry, stopLoss, takeProfit]; returns the projected
// screen points plus the risk (entry–SL) and reward (entry–TP) y-bands.
export function positionZones(drawing, transform) {
  const points = drawing.anchorPoints
    .map((anchor) => transform.anchorToPixel(anchor))
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (points.length < 2) return null;
  const entry = points[0]; const sl = points[1] || entry; const tp = points[2] || entry;
  const top = Math.min(entry.y, sl.y, tp.y);
  const bottom = Math.max(entry.y, sl.y, tp.y);
  const left = Math.min(entry.x, sl.x, tp.x);
  const right = Math.max(entry.x, sl.x, tp.x);
  const riskTop = Math.min(entry.y, sl.y); const riskBottom = Math.max(entry.y, sl.y);
  const rewardTop = Math.min(entry.y, tp.y); const rewardBottom = Math.max(entry.y, tp.y);
  return {
    entry, sl, tp, top, bottom, left, right,
    riskTop, riskBottom, rewardTop, rewardBottom,
    // Bands span the anchors' x-extent (left/right above); the renderer and
    // hit test clamp to those bounds.
    riskRect: { y: riskTop, height: riskBottom - riskTop },
    rewardRect: { y: rewardTop, height: rewardBottom - rewardTop },
    // Body-move centroid: the midpoint between the two outer prices.
    center: { x: (left + right) / 2, y: (entry.y + tp.y) / 2 },
  };
}
