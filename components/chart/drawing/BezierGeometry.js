'use client';

// BezierGeometry — pure cubic/quadratic Bezier + circular-arc math.
// Shared by PathHitTester (distance queries), StrokeSmoother (handle
// generation) and the curve/arc tools (geometry + rendering). All functions
// operate on plain { x, y } points; no canvas or viewport dependencies.

export function cubicPoint(p0, c1, c2, p3, t) {
  const u = 1 - t;
  const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  };
}

export function quadraticPoint(p0, c1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * c1.y + t * t * p2.y,
  };
}

// Distance from `point` to a cubic Bezier, subdivided `steps` times.
export function distanceToCubic(point, p0, c1, c2, p3, steps = 12) {
  let best = Infinity; let prev = cubicPoint(p0, c1, c2, p3, 0);
  for (let i = 1; i <= steps; i += 1) {
    const next = cubicPoint(p0, c1, c2, p3, i / steps);
    const d = distanceToSegment(point, prev, next);
    if (d < best) best = d;
    prev = next;
  }
  return best;
}

export function distanceToQuadratic(point, p0, c1, p2, steps = 12) {
  let best = Infinity; let prev = quadraticPoint(p0, c1, p2, 0);
  for (let i = 1; i <= steps; i += 1) {
    const next = quadraticPoint(p0, c1, p2, i / steps);
    const d = distanceToSegment(point, prev, next);
    if (d < best) best = d;
    prev = next;
  }
  return best;
}

// Catmull-Rom → cubic control points for a smooth curve through `points`
// (closed loops back to the first point). Returns an array of segments
// [{ p0, c1, c2, p1 }] sharing endpoints.
export function catmullRomSegments(points, closed = false) {
  const segments = [];
  const n = points.length;
  if (n < 3) {
    if (n === 2) segments.push({ p0: points[0], c1: points[0], c2: points[1], p1: points[1] });
    return segments;
  }
  const at = (i) => {
    if (closed) return points[((i % n) + n) % n];
    return points[Math.max(0, Math.min(n - 1, i))];
  };
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i += 1) {
    const p0 = at(i); const p1 = at(i + 1);
    const m0 = { x: (at(i + 1).x - at(i - 1).x) / 6, y: (at(i + 1).y - at(i - 1).y) / 6 };
    const m1 = { x: (at(i + 2).x - at(i).x) / 6, y: (at(i + 2).y - at(i).y) / 6 };
    segments.push({
      p0, p1,
      c1: { x: p0.x + m0.x, y: p0.y + m0.y },
      c2: { x: p1.x - m1.x, y: p1.y - m1.y },
    });
  }
  return segments;
}

// Circle through three points; returns { center, radius } or null when the
// points are collinear.
export function circleThrough(a, b, c) {
  const ax = a.x - c.x; const ay = a.y - c.y;
  const bx = b.x - c.x; const by = b.y - c.y;
  const d = 2 * (ax * by - ay * bx);
  if (Math.abs(d) < 1e-9) return null;
  const a2 = ax * ax + ay * ay; const b2 = bx * bx + by * by;
  const ux = (a2 * by - b2 * ay) / d; const uy = (b2 * ax - a2 * bx) / d;
  const center = { x: c.x + ux, y: c.y + uy };
  const radius = Math.hypot(a.x - center.x, a.y - center.y);
  return { center, radius };
}

// Arc sweeps from `start` to `end` through the middle point, choosing the
// direction (ccw/cw) that keeps the arc on the same side as the given points.
export function arcThrough(a, b, c) {
  const circle = circleThrough(a, b, c);
  if (!circle) return null;
  const start = Math.atan2(a.y - circle.center.y, a.x - circle.center.x);
  const middle = Math.atan2(b.y - circle.center.y, b.x - circle.center.x);
  const end = Math.atan2(c.y - circle.center.y, c.x - circle.center.x);
  // Both arcs from start to end contain exactly one of {middle, anti-middle};
  // the middle point decides the sweep. relEnd is the minor ccw arc.
  const relStart = normalize(middle - start);
  const relEnd = normalize(end - start);
  const ccw = relStart <= relEnd;
  const sweep = ccw ? relEnd : relEnd - Math.PI * 2;
  return { center: circle.center, radius: circle.radius, start, end: start + sweep };
}

// Point on the arc (t in [0,1] along the sweep).
export function arcPoint(arc, t) {
  const angle = arc.start + (arc.end - arc.start) * t;
  return { x: arc.center.x + Math.cos(angle) * arc.radius, y: arc.center.y + Math.sin(angle) * arc.radius };
}

export function distanceToArc(point, arc, threshold = 7) {
  const dx = point.x - arc.center.x; const dy = point.y - arc.center.y;
  const radial = Math.abs(Math.hypot(dx, dy) - arc.radius);
  if (radial > threshold) return radial;
  const sweep = arc.end - arc.start; // signed, |sweep| < 2π
  const rel = normalize(Math.atan2(dy, dx) - arc.start);
  const onSweep = sweep >= 0 ? rel <= sweep : rel >= Math.PI * 2 + sweep;
  if (onSweep) return radial;
  const dEnd = Math.hypot(point.x - arcPoint(arc, 1).x, point.y - arcPoint(arc, 1).y);
  const dStart = Math.hypot(point.x - arcPoint(arc, 0).x, point.y - arcPoint(arc, 0).y);
  return Math.min(dEnd, dStart);
}

// Sample the arc as a polyline (subdivided by sweep magnitude).
export function arcPolyline(arc, segments = 24) {
  const steps = Math.max(8, Math.min(segments, Math.ceil((Math.abs(arc.end - arc.start) / Math.PI) * segments)));
  const out = [];
  for (let i = 0; i <= steps; i += 1) out.push(arcPoint(arc, i / steps));
  return out;
}

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

const normalize = (angle) => ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
