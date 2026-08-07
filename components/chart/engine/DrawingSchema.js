'use client';
export const DRAWING_TYPES = ['trend', 'hline', 'vline', 'horizontalRay', 'infoLine', 'rect', 'rotatedRect', 'circle', 'ellipse', 'triangle', 'supplyZone', 'demandZone', 'smcZone', 'premiumDiscountZone', 'parallelChannel', 'flatTopChannel', 'flatBottomChannel', 'disjointChannel', 'regressionChannel', 'linearRegressionChannel', 'ray', 'extended', 'crossline', 'doubleArrow', 'text', 'anchoredText', 'note', 'callout', 'arrowCallout', 'balloon', 'infoBox', 'label', 'priceLabel', 'timeLabel', 'arrow', 'arrowMarkUp', 'arrowMarkDown', 'measure', 'fib', 'fibExtension', 'fibProjection', 'fibFan', 'fibChannel', 'fibSpiral', 'fibTimeZone', 'trendFib', 'brush', 'highlighter', 'eraser', 'path', 'polyline', 'curve', 'arc', 'pitchfork', 'longPosition', 'shortPosition', 'riskReward', 'fixedRisk', 'fixedReward', 'customPosition'];
export function createDrawing({ symbol, timeframe, drawingType, anchorPoints, ...rest }) {
  if (!symbol || !timeframe || !DRAWING_TYPES.includes(drawingType)) throw new Error('Invalid drawing identity');
  if (!Array.isArray(anchorPoints) || !anchorPoints.length || anchorPoints.some((point) => !Number.isFinite(point.time) || !Number.isFinite(point.price))) throw new Error('Invalid drawing anchor points');
  return { id: crypto.randomUUID(), symbol, timeframe, drawingType, anchorPoints: anchorPoints.map(({ time, price }) => ({ time, price })), style: {}, ...rest };
}
export function drawingScopeFor(drawing) { return `${drawing.symbol}:${drawing.timeframe}`; }
