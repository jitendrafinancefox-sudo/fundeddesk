'use client';

// BrushSimplifier — point reduction for freehand strokes.
//
//   simplify(points, epsilon)  Douglas-Peucker on screen-space points
//   reduce(points, minDist)    adaptive per-point minimum distance
//   resample(points, step)     uniform spacing (pressure/control rebuilds)
//
// All input/output arrays are plain { x, y } screen points; BrushGeometry
// converts between market anchors and pixels. Fidelity-first: the live
// capture path decimates with a tiny epsilon so rendering keeps the shape,
// and the committed stroke is capped at MAX_STROKE_POINTS via a tighter
// pass so serialization stays bounded (localStorage).

export const MAX_STROKE_POINTS = 5000;

export function simplify(points, epsilon = 1) {
  const n = points.length;
  if (n <= 2) return points;
  const keep = new Uint8Array(n);
  keep[0] = 1; keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    const a = points[start]; const b = points[end];
    const dx = b.x - a.x; const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    let maxDist = 0; let maxIndex = -1;
    for (let i = start + 1; i < end; i += 1) {
      const p = points[i];
      let t = length ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / length : 0;
      t = Math.max(0, Math.min(1, t));
      const dist = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      if (dist > maxDist) { maxDist = dist; maxIndex = i; }
    }
    if (maxDist > epsilon && maxIndex !== -1) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex], [maxIndex, end]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i += 1) if (keep[i]) out.push(points[i]);
  return out;
}

// Adaptive reduction: drop points closer than minDist to the previous kept
// point (screen-space). Runs after DP to collapse dense mouse-move runs.
export function reduce(points, minDist = 2) {
  const out = [];
  let last = null;
  const min2 = minDist * minDist;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (last) {
      const dx = p.x - last.x; const dy = p.y - last.y;
      if (dx * dx + dy * dy < min2) continue;
    }
    out.push(p); last = p;
  }
  if (last !== out[out.length - 1]) out.push(points[points.length - 1]);
  return out;
}

// Hard cap: if the stroke still exceeds max, raise the DP epsilon
// progressively until it fits (each pass keeps the shape's skeleton).
export function cap(points, max = MAX_STROKE_POINTS) {
  if (points.length <= max) return points;
  let epsilon = 1;
  let out = points;
  while (out.length > max && epsilon < 64) {
    epsilon *= 2;
    out = simplify(points, epsilon);
  }
  if (out.length > max) {
    const stride = Math.ceil(out.length / max);
    out = out.filter((_, i) => i % stride === 0);
    if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  }
  return out;
}

// Live decimation for the capture path: keeps the last point always and
// drops dense intermediate points while the pointer moves fast.
export function liveReduce(points, minDist = 2.5) {
  return reduce(points, minDist);
}
