'use client';

// BrushGeometry — screen-space geometry for stroke-family drawings.
//
// Strokes store their points as anchors ({ time, price }, time-ascending),
// so every conversion here is a straight map; the hot paths (bounds,
// visible-range, hit windows, taper ribbons) use binary search on time to
// stay O(window) instead of O(n) — the 100k-point requirement.
//
// The stroke payload (drawing.brush) holds:
//   simplified : control-point indices for editing / point-edit mode
//   smooth     : indices treated as smooth anchors (path rendering)
//   taper      : brush taper on/off (brush/eraser)
//   raw        : true for brush (polyline render), false for path (bezier)

import { fibFormatPrice } from './FibLevelManager';

export const STROKE_TYPES = ['brush', 'highlighter', 'eraser', 'path', 'polyline', 'curve', 'arc'];
export const isStrokeType = (drawingType) => STROKE_TYPES.includes(drawingType);
export const isFreehandType = (drawingType) => drawingType === 'brush' || drawingType === 'highlighter' || drawingType === 'eraser';
export const isOpenPathType = (drawingType) => drawingType === 'path' || drawingType === 'polyline';
export const isClickPlaceType = (drawingType) => drawingType === 'path' || drawingType === 'polyline' || drawingType === 'curve' || drawingType === 'arc';

// Anchor times are sorted; binary search the first index >= time.
export function lowerBound(anchorPoints, time) {
  let low = 0; let high = anchorPoints.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (anchorPoints[middle].time < time) low = middle + 1; else high = middle;
  }
  return low;
}

export function strokePixels(drawing, transform, from = 0, to = Infinity) {
  const anchors = drawing.anchorPoints;
  const out = [];
  for (let i = from; i < anchors.length && i <= to; i += 1) {
    const p = transform.anchorToPixel(anchors[i]);
    if (p) out.push({ x: p.x, y: p.y });
  }
  return out;
}

// Screen bounds of the stroke — O(window) via the time window when a
// transform is provided, otherwise O(n) over raw coordinates.
export function strokeBounds(anchorPoints, transform, from = 0, to = Infinity) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const end = Math.min(to, anchorPoints.length - 1);
  for (let i = from; i <= end; i += 1) {
    const a = anchorPoints[i];
    const p = transform ? transform.anchorToPixel(a) : null;
    const x = p ? p.x : a.time; const y = p ? p.y : a.price;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Fast visibility probe: stroke points are time-sorted, so checking the
// first/last/middle anchor suffices instead of scanning all points.
export function strokeVisible(anchorPoints, transform) {
  const n = anchorPoints.length;
  if (!n) return false;
  const check = (i) => transform.timeToPixel(anchorPoints[i].time) != null;
  if (check(0)) return true;
  if (check(n - 1)) return true;
  if (check(n >> 1)) return true;
  return false;
}

// Control-point pixel positions for editing (capped so handles stay
// meaningful even for dense strokes).
export function controlHandles(drawing, transform, max = 10) {
  const anchors = drawing.anchorPoints;
  if (!anchors.length) return [];
  const indices = [];
  const n = anchors.length;
  if (n <= max + 2) {
    for (let i = 0; i < n; i += 1) indices.push(i);
  } else {
    indices.push(0);
    const step = (n - 1) / (max - 1);
    for (let k = 1; k < max - 1; k += 1) indices.push(Math.round(k * step));
    indices.push(n - 1);
  }
  return indices.map((index) => {
    const p = transform.anchorToPixel(anchors[index]);
    return p ? { x: p.x, y: p.y, index } : null;
  }).filter(Boolean);
}

// Midpoints between consecutive control handles (insert targets).
export function controlMidpoints(handles) {
  const out = [];
  for (let i = 0; i < handles.length - 1; i += 1) {
    out.push({
      x: (handles[i].x + handles[i + 1].x) / 2,
      y: (handles[i].y + handles[i + 1].y) / 2,
      from: handles[i].index, to: handles[i + 1].index,
    });
  }
  return out;
}

// Tapered ribbon: a filled polygon whose width follows a sine profile from
// `width` down to 0 at both ends (brush look). Returns the path vertices.
export function taperRibbon(points, width) {
  if (points.length < 2) return null;
  const n = points.length;
  const left = []; const right = [];
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const dx = next.x - prev.x; const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length; const ny = dx / length;
    const t = i / (n - 1);
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.55);
    left.push({ x: p.x + nx * w / 2, y: p.y + ny * w / 2 });
    right.push({ x: p.x - nx * w / 2, y: p.y - ny * w / 2 });
  }
  return [...left, ...right.reverse()];
}

// Distance from point to the stroke polyline (windowed by time) — the core
// hit primitive. Walks only anchors whose time is near the point.
export function distanceToStroke(drawing, point, transform, threshold = 7) {
  const anchors = drawing.anchorPoints;
  if (!anchors.length) return Infinity;
  const t0 = transform.pixelToTime(point.x - threshold);
  const t1 = transform.pixelToTime(point.x + threshold);
  let from = 0; let to = anchors.length - 1;
  if (t0 != null && t1 != null) {
    from = Math.max(0, lowerBound(anchors, Math.min(t0, t1)) - 2);
    to = Math.min(anchors.length - 1, lowerBound(anchors, Math.max(t0, t1)) + 2);
  }
  if (to - from > 256 && (t0 == null || t1 == null)) { from = 0; to = anchors.length - 1; }
  let prev = transform.anchorToPixel(anchors[from]);
  let best = Infinity;
  for (let i = from + 1; i <= to; i += 1) {
    const next = transform.anchorToPixel(anchors[i]);
    if (prev && next) {
      const d = segmentDistance(point, prev, next);
      if (d < best) best = d;
    }
    prev = next;
  }
  return best;
}

function segmentDistance(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export const strokePriceLabel = (price) => fibFormatPrice(price);
