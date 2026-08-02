'use client';

// Pure geometry primitives shared by hit testing, snapping, marquee selection,
// and dirty-rect computation. No dependencies on the viewport or canvas — all
// functions operate on plain { x, y } / { x, y, width, height } objects.
const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp01(((point.x - a.x) * dx + (point.y - a.y) * dy) / length) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function pointInRect(point, rect, padding = 0) {
  return point.x >= rect.x - padding && point.x <= rect.x + rect.width + padding
    && point.y >= rect.y - padding && point.y <= rect.y + rect.height + padding;
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function unionRect(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

export function padRect(rect, padding) {
  return { x: rect.x - padding, y: rect.y - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 };
}

export function rectFromPoints(points) {
  if (!points.length) return null;
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  points.forEach((p) => { if (p == null) return; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Screen-space bounding box of a drawing's anchors, or null when none of the
// anchors project onto the canvas (e.g. after a data reload, or off-screen).
export function anchorsRect(anchorPoints, transform) {
  return rectFromPoints(anchorPoints.map(transform.anchorToPixel));
}

export function pointInEllipse(point, center, radiusX, radiusY) {
  const dx = (point.x - center.x) / Math.max(1, radiusX);
  const dy = (point.y - center.y) / Math.max(1, radiusY);
  return dx * dx + dy * dy <= 1;
}

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
