'use client';
import { createDrawing } from './engine/DrawingSchema';
export function createDrawingEngine({ coordinateSystem, addDrawing, symbol, timeframe }) {
  let start = null;
  return {
    start(point) { start = coordinateSystem.fromPoint(point); },
    finish(point, drawingType) {
      const end = coordinateSystem.fromPoint(point);
      if (start && end) addDrawing(createDrawing({ symbol, timeframe, drawingType, anchorPoints: drawingType === 'hline' || drawingType === 'text' ? [start] : [start, end] }));
      start = null;
    },
    cancel() { start = null; },
  };
}
