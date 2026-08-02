'use client';
export const DRAWING_TYPES = ['trend', 'hline', 'vline', 'rect', 'ellipse', 'ray', 'extended', 'text', 'arrow', 'measure', 'fib', 'brush', 'parallelChannel', 'pitchfork'];
export function createDrawing({ symbol, timeframe, drawingType, anchorPoints, ...rest }) {
  if (!symbol || !timeframe || !DRAWING_TYPES.includes(drawingType)) throw new Error('Invalid drawing identity');
  if (!Array.isArray(anchorPoints) || !anchorPoints.length || anchorPoints.some((point) => !Number.isFinite(point.time) || !Number.isFinite(point.price))) throw new Error('Invalid drawing anchor points');
  return { id: crypto.randomUUID(), symbol, timeframe, drawingType, anchorPoints: anchorPoints.map(({ time, price }) => ({ time, price })), style: {}, ...rest };
}
export function drawingScopeFor(drawing) { return `${drawing.symbol}:${drawing.timeframe}`; }
