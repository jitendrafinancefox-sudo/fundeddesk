'use client';

// Hit-testing entry points for drawings. Pure geometry primitives live in
// GeometryPrimitives (leaf module) and are re-exported here for back-compat —
// all consumers may import them from either module.
export {
  distanceToSegment,
  pointInRect,
  rectsOverlap,
  unionRect,
  padRect,
  rectFromPoints,
  anchorsRect,
  pointInEllipse,
} from './GeometryPrimitives';

// True when the drawing's geometry passes within `threshold` pixels of the
// point. Type-aware: lines use segment distance, shapes use containment.
// Delegates to the per-tool definitions so hit behavior stays in one place.
import { hitTestDrawing } from './DrawingDefinitions';
export function drawingHit(drawing, point, transform, threshold = 7) {
  return hitTestDrawing(drawing, point, transform, threshold);
}

// Anchor-proximity hit (the drag handle): true when any anchor is within
// `threshold` pixels of the point.
export function anchorHit(drawing, point, transform, threshold = 9) {
  return drawing.anchorPoints.some((anchor) => { const p = transform.anchorToPixel(anchor); return p && Math.hypot(p.x - point.x, p.y - point.y) < threshold; });
}
