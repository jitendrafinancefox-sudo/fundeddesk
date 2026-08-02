'use client';

// StrokeSmoother — smooth rendering + edit-time control geometry.
//
//   smoothPath(points, closed)   Catmull-Rom → cubic segments
//   smoothFlags(points, smooth)  segments split at sharp anchors
//
// A drawing whose brush payload carries `smooth` (array of anchor indices)
// renders as a bezier through its anchors, with sharp anchors acting as
// corners. `smoothAll` converts a raw stroke to an editable control path:
// the anchor set becomes the control polygon and rendering interpolates
// through it — this is what point editing of brush strokes uses.

import { catmullRomSegments } from './BezierGeometry';

// Segments for a smooth path through `points`, honoring `sharp` (set of
// indices where the curve must stop and restart — a corner).
export function smoothPath(points, sharp = new Set()) {
  if (points.length < 2) return [];
  const runs = [];
  let run = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    run.push(points[i]);
    if (sharp.has(i)) { runs.push(run); run = [points[i]]; }
  }
  if (run.length > 1) runs.push(run);
  const segments = [];
  runs.forEach((part) => {
    const segs = catmullRomSegments(part, false);
    segs.forEach((segment) => {
      if (segments.length && same(segments[segments.length - 1].p1, segment.p0)) segments.push({ ...segment, p0: segments[segments.length - 1].p1 });
      else segments.push(segment);
    });
  });
  return segments;
}

// Rebuild a stroke's anchors as a smoothed control polygon: decimate the
// raw points to a bounded control set, mark all smooth.
export function controlPointsFrom(rawPoints, maxControl = 60) {
  const n = rawPoints.length;
  if (n <= maxControl) return rawPoints;
  const stride = Math.ceil(n / maxControl);
  const out = [];
  for (let i = 0; i < n; i += stride) out.push(rawPoints[i]);
  if (out[out.length - 1] !== rawPoints[n - 1]) out.push(rawPoints[n - 1]);
  return out;
}

const same = (a, b) => a.x === b.x && a.y === b.y;
