'use client';

// BrushSerializer — payload sanitization for the stroke family.
//
// v5 adds drawing.brush ({ taper, raw, smooth }) for freehand strokes and
// drawing.bezier ({ handles }) for curve tool control points. Anchor counts
// are capped (localStorage envelope); the cap decimates by stride so the
// shape is preserved. Malformed payloads are dropped, numbers coerced.

import { MAX_STROKE_POINTS } from './BrushSimplifier';
import { isStrokeType } from './BrushGeometry';

const STROKE_LABELS = {
  brush: 'Brush', highlighter: 'Highlighter', eraser: 'Eraser',
  path: 'Path', polyline: 'Polyline', curve: 'Curve', arc: 'Arc',
};

export function strokeLabelFor(drawingType) {
  return STROKE_LABELS[drawingType] || drawingType;
}

export function sanitizeStroke(drawing) {
  if (!isStrokeType(drawing.drawingType)) return drawing;
  const anchors = drawing.anchorPoints
    .map((point) => ({ time: Number(point.time), price: Number(point.price) }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.price))
    .sort((a, b) => a.time - b.time);
  if (anchors.length > MAX_STROKE_POINTS) {
    const stride = Math.ceil(anchors.length / MAX_STROKE_POINTS);
    const kept = [];
    for (let i = 0; i < anchors.length - 1; i += stride) kept.push(anchors[i]);
    kept.push(anchors[anchors.length - 1]);
    while (kept.length > MAX_STROKE_POINTS) kept.splice(1, Math.ceil((kept.length - MAX_STROKE_POINTS) / 2));
    anchors.length = 0; anchors.push(...kept);
  }
  const brush = drawing.brush;
  const nextBrush = (typeof brush === 'object' && brush !== null)
    ? {
      taper: brush.taper !== false,
      raw: brush.raw !== false,
      smooth: Array.isArray(brush.smooth) ? brush.smooth.slice(0, anchors.length).map((flag) => flag !== false) : null,
    }
    : {
      taper: drawing.drawingType === 'brush' || drawing.drawingType === 'eraser',
      raw: drawing.drawingType !== 'path',
      smooth: null,
    };
  const next = { ...drawing, anchorPoints: anchors, brush: nextBrush };
  if (drawing.drawingType === 'curve' && Array.isArray(drawing.bezier?.handles)) {
    next.bezier = { handles: drawing.bezier.handles.map((h) => ({ x: Number(h.x), y: Number(h.y) })).filter((h) => Number.isFinite(h.x) && Number.isFinite(h.y)) };
  }
  return next;
}
