'use client';

// BrushEngine — freehand capture, finalization and erasing.
//
//   captureAppend / captureStart  live point collection (market coords)
//   finalizeStroke                decimation + payload on pointer-up
//   convertToSmooth               stroke → editable smoothed control path
//   eraseStroke                   partial/segment erase with auto-split
//
// The capture path keeps anchors in { time, price } market coordinates at
// all times; decimation thresholds are applied in screen space through the
// current transform so density follows zoom (adaptive point reduction).

import { liveReduce, simplify, cap, MAX_STROKE_POINTS } from './BrushSimplifier';
import { controlPointsFrom } from './StrokeSmoother';
import { distanceToStroke } from './BrushGeometry';

const MIN_ERASE_RUN = 4;

// Only a fully-resolved pixel->anchor result is usable: coordinateToTime and
// coordinateToPrice return null outside the plotted range (past the last
// candle, over the scale margins), so the anchor itself can carry null
// fields even though pixelToAnchor always returns an object. Drop those
// points silently — a stroke simply doesn't extend past the valid area, it
// never carries an invalid {time, price} anchor downstream. This is the only
// place the brush path converts pointer positions, so the guard stays cheap
// (two Number.isFinite checks per captured point).
const usableAnchor = (transform, x, y) => {
  const anchor = transform.pixelToAnchor(x, y);
  return anchor && Number.isFinite(anchor.time) && Number.isFinite(anchor.price) ? anchor : null;
};

export function captureStart(transform, point) {
  const anchor = usableAnchor(transform, point.x, point.y);
  return anchor ? [{ time: anchor.time, price: anchor.price }] : null;
}

// Append `point` when it clears the screen-space minimum distance from the
// previous anchor. Returns the new anchors array (or null when skipped).
export function captureAppend(anchors, transform, point, minDist = 2.5) {
  if (!anchors.length) return null;
  const last = anchors[anchors.length - 1];
  const pixel = transform.anchorToPixel(last);
  if (pixel) {
    const dx = point.x - pixel.x; const dy = point.y - pixel.y;
    if (dx * dx + dy * dy < minDist * minDist) return null;
  }
  const anchor = usableAnchor(transform, point.x, point.y);
  if (!anchor) return null;
  return [...anchors, { time: anchor.time, price: anchor.price }];
}

// Final decimation + payload. `kind` drives defaults: brush/eraser taper on,
// path/highlighter taper off. Returns a fresh drawing object.
export function finalizeStroke(drawing, transform, { taper, raw, smooth = null } = {}) {
  const anchors = drawing.anchorPoints;
  if (anchors.length < 2) return drawing;
  const pixels = anchors.map((a) => { const p = transform.anchorToPixel(a); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
  let kept = simplify(pixels, 0.75);
  kept = cap(kept, MAX_STROKE_POINTS);
  if (kept.length !== anchors.length) {
    // Map kept screen points back to the nearest anchor (same index order).
    const indexOf = (p) => {
      let best = 0; let bestDist = Infinity;
      for (let i = 0; i < pixels.length; i += 1) {
        const dx = pixels[i].x - p.x; const dy = pixels[i].y - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    };
    const indices = kept.map(indexOf).sort((a, b) => a - b);
    drawing = { ...drawing, anchorPoints: indices.map((i) => anchors[i]) };
  }
  const type = drawing.drawingType;
  const effectiveTaper = taper ?? (type === 'brush' || type === 'eraser');
  const effectiveRaw = raw ?? (type !== 'path');
  const brush = {
    taper: effectiveTaper,
    raw: effectiveRaw,
    smooth: smooth || (effectiveRaw ? [] : null),
  };
  return { ...drawing, brush };
}

// Convert a raw stroke to an editable smoothed control path: anchors become
// a bounded control polygon and rendering interpolates through them.
export function convertToSmooth(drawing, transform, maxControl = 60) {
  const pixels = drawing.anchorPoints.map((a) => { const p = transform.anchorToPixel(a); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
  const controls = controlPointsFrom(pixels, maxControl);
  const anchors = controls.map((p) => transform.pixelToAnchor(p.x, p.y));
  return { ...drawing, anchorPoints: anchors, brush: { ...(drawing.brush || {}), raw: false, smooth: null, taper: false } };
}

// Erase `target` with the eraser stroke. Returns an array of fragment
// drawings (empty = fully erased), or null when the eraser missed entirely.
// Fragments keep the original style; each is re-finalized.
export function eraseStroke(target, eraserDrawing, transform) {
  const targetAnchors = target.anchorPoints;
  if (targetAnchors.length < 2) return null;
  const eraserPixels = eraserDrawing.anchorPoints.map((a) => transform.anchorToPixel(a)).filter(Boolean);
  if (eraserPixels.length < 2) return null;
  const width = (eraserDrawing.style?.lineWidth || 18) / 2 + 4;
  // X-bucket the eraser polyline so distance checks are O(window).
  const buckets = new Map();
  const bucketOf = (x) => Math.floor(x / width);
  eraserPixels.forEach((p) => {
    const key = bucketOf(p.x);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  });
  const near = (x) => {
    const key = bucketOf(x);
    const out = [...(buckets.get(key) || []), ...(buckets.get(key - 1) || []), ...(buckets.get(key + 1) || [])];
    return out;
  };
  const hit = [];
  const targetPixels = targetAnchors.map((a) => { const p = transform.anchorToPixel(a); return p ? { x: p.x, y: p.y } : null; });
  for (let i = 0; i < targetAnchors.length; i += 1) {
    const pixel = targetPixels[i];
    if (!pixel) { hit.push(false); continue; }
    const nearest = near(pixel.x);
    let erased = false;
    for (let k = 0; k < nearest.length && !erased; k += 1) {
      const next = nearest[k + 1] || nearest[k];
      if (segmentDistance(pixel, nearest[k], next) <= width) erased = true;
    }
    hit.push(erased);
  }
  const anyErased = hit.some(Boolean);
  if (!anyErased) return null;
  const runs = [];
  let run = [];
  for (let i = 0; i < hit.length; i += 1) {
    if (!hit[i]) run.push(i);
    else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  if (runs.length === 1 && runs[0].length === targetAnchors.length) return null; // no-op (missed)
  const fragments = runs
    .filter((indices) => indices.length >= MIN_ERASE_RUN)
    .map((indices) => {
      const anchors = indices.map((i) => targetAnchors[i]);
      const fragment = { ...target, id: crypto.randomUUID(), anchorPoints: anchors, brush: { ...(target.brush || {}), smooth: null } };
      return finalizeStroke(fragment, transform, { taper: fragment.brush.taper, raw: fragment.brush.raw });
    });
  return fragments;
}

export function segmentDistance(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

// Whole-object erase (non-stroke targets): true when the eraser touches.
export function eraseTouches(target, eraserDrawing, transform) {
  const eraserPixels = eraserDrawing.anchorPoints.map((a) => transform.anchorToPixel(a)).filter(Boolean);
  if (eraserPixels.length < 2) return false;
  const width = (eraserDrawing.style?.lineWidth || 18) / 2 + 6;
  for (let i = 0; i < eraserPixels.length - 1; i += 1) {
    if (distanceToStroke(target, { x: (eraserPixels[i].x + eraserPixels[i + 1].x) / 2, y: (eraserPixels[i].y + eraserPixels[i + 1].y) / 2 }, transform, width) <= width) return true;
  }
  return false;
}
