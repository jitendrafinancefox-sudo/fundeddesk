'use client';
import { distanceToSegment } from './GeometryEngine';

// Pure channel math: every channel is stored as time+price anchors and
// reduced to screen-space lines here for rendering, hit testing and handles.
// The parallel constraint is structural — the offset line is always derived
// as "parallel through anchor N", so the two lines can never diverge no
// matter how the anchors are edited.
//
// Anchor layouts (time+price only):
//   parallelChannel          [baseA, baseB, offsetPoint]
//   regressionChannel        [windowA, windowB, offsetPoint] + drawing.regression
//   linearRegressionChannel  [windowA, windowB, widthPoint]  + drawing.regression
//   flatTopChannel           [flatPoint, slopeA, slopeB]
//   flatBottomChannel        [flatPoint, slopeA, slopeB]
//   disjointChannel          [line1A, line1B, line2A, line2B]

export const CHANNEL_TYPES = ['parallelChannel', 'flatTopChannel', 'flatBottomChannel', 'disjointChannel', 'regressionChannel', 'linearRegressionChannel'];
export const REGRESSION_TYPES = ['regressionChannel', 'linearRegressionChannel'];
export const isChannelType = (drawingType) => CHANNEL_TYPES.includes(drawingType);
export const isRegressionType = (drawingType) => REGRESSION_TYPES.includes(drawingType);

// Least-squares fit of close prices over the candle window between two
// anchor times. Returns { slope, intercept } in price-per-second units, or
// null when the window holds fewer than two candles.
export function fitLinearRegression(candles, t0, t1) {
  const a = Math.min(t0, t1); const b = Math.max(t0, t1);
  const points = (candles || []).filter((candle) => candle.time >= a && candle.time <= b && Number.isFinite(candle.close));
  const n = points.length;
  if (n < 2) return null;
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
  for (const point of points) { sx += point.time; sy += point.close; sxx += point.time * point.time; sxy += point.time * point.close; }
  const denominator = n * sxx - sx * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const slope = (n * sxy - sx * sy) / denominator;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept, count: n };
}

export const regressionPriceAt = (regression, time) => regression.slope * time + regression.intercept;

// Project `p` onto the segment a->b; returns the closest point plus the
// along-line parameter t (unclamped).
export function projectPointOnLine(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (length2 < 1e-9) return { x: a.x, y: a.y, t: 0 };
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2;
  return { x: a.x + t * dx, y: a.y + t * dy, t };
}

// Unit normal of a segment (rotated 90° counter-clockwise in screen space).
export function lineNormal(a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return { nx: -dy / length, ny: dx / length };
}

// Signed perpendicular distance of `point` from the line through a->b
// (positive on the normal's side).
export function perpendicularOffset(point, a, b) {
  const proj = projectPointOnLine(point, a, b);
  const n = lineNormal(a, b);
  return (point.x - proj.x) * n.nx + (point.y - proj.y) * n.ny;
}

const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Extend a segment far beyond the canvas in both directions per the extend
// flags; a segment that extends in a direction keeps that direction's edge
// point at the anchor instead.
export function extendLine(a, b, extendLeft, extendRight) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length; const uy = dy / length;
  const margin = 20000;
  return {
    a: extendLeft ? { x: a.x - ux * margin, y: a.y - uy * margin } : a,
    b: extendRight ? { x: b.x + ux * margin, y: b.y + uy * margin } : b,
  };
}

// Horizontal extent of a flat line covering all anchor x positions, extended
// per the extend flags.
export function extendFlat(y, anchorXs, extendLeft, extendRight) {
  const margin = 20000;
  const minX = Math.min(...anchorXs); const maxX = Math.max(...anchorXs);
  return { a: { x: extendLeft ? minX - margin : minX, y }, b: { x: extendRight ? maxX + margin : maxX, y } };
}

// Reduce a channel drawing to renderable screen-space geometry. Returns
// null while the drawing lacks enough anchors to form its shape.
export function channelGeometry(drawing, transform) {
  const type = drawing.drawingType;
  const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
  const parallel = (p0, p1, p2) => {
    const n = lineNormal(p0, p1);
    const baseMid = midpointOf(p0, p1);
    const width = perpendicularOffset(p2, p0, p1);
    const offsetA = p2; const offsetB = { x: p2.x + (p1.x - p0.x), y: p2.y + (p1.y - p0.y) };
    return {
      baseA: p0, baseB: p1, offA: offsetA, offB: offsetB,
      center: { x: baseMid.x + n.nx * width / 2, y: baseMid.y + n.ny * width / 2 },
      baseMid, width, n, type,
    };
  };
  if (type === 'parallelChannel') {
    const [p0, p1, p2] = points;
    if (!p0 || !p1) return null;
    if (!p2) return { baseA: p0, baseB: p1, type };
    return parallel(p0, p1, p2);
  }
  if (type === 'regressionChannel') {
    const [a0, a1, a2] = points;
    if (!a0 || !a1) return null;
    const fit = drawing.regression;
    const yAt = (anchor) => (fit ? transform.priceToPixel(regressionPriceAt(fit, anchor.time)) : anchor.y);
    const p0 = { x: a0.x, y: yAt(a0) }; const p1 = { x: a1.x, y: yAt(a1) };
    if (!a2) return { baseA: p0, baseB: p1, type };
    return parallel(p0, p1, a2);
  }
  if (type === 'linearRegressionChannel') {
    const [a0, a1, a2] = points;
    if (!a0 || !a1) return null;
    // The fitted line is preferred; without one (pre-v3 payloads) fall back
    // to the window anchors themselves so the band still renders.
    const fit = drawing.regression;
    const p0 = fit ? { x: a0.x, y: transform.priceToPixel(regressionPriceAt(fit, a0.time)) } : a0;
    const p1 = fit ? { x: a1.x, y: transform.priceToPixel(regressionPriceAt(fit, a1.time)) } : a1;
    if (!a2) return { baseA: p0, baseB: p1, type };
    const n = lineNormal(p0, p1);
    const width = perpendicularOffset(a2, p0, p1);
    return {
      baseA: p0, baseB: p1,
      upperA: { x: p0.x + n.nx * width, y: p0.y + n.ny * width },
      upperB: { x: p1.x + n.nx * width, y: p1.y + n.ny * width },
      lowerA: { x: p0.x - n.nx * width, y: p0.y - n.ny * width },
      lowerB: { x: p1.x - n.nx * width, y: p1.y - n.ny * width },
      center: p0, baseMid: midpointOf(p0, p1), width: Math.abs(width), n, type, symmetric: true,
    };
  }
  if (type === 'flatTopChannel' || type === 'flatBottomChannel') {
    const [p0, p1, p2] = points;
    if (!p0 || !p1 || !p2) return null;
    const flatMid = { x: (p0.x + p2.x) / 2, y: p0.y };
    const slopeMid = midpointOf(p1, p2);
    return {
      flatPoint: p0, slopeA: p1, slopeB: p2,
      center: midpointOf(flatMid, slopeMid), type,
    };
  }
  if (type === 'disjointChannel') {
    const [p0, p1, p2, p3] = points;
    if (!p0 || !p1) return null;
    if (!p2 || !p3) return { baseA: p0, baseB: p1, type };
    return {
      line1A: p0, line1B: p1, line2A: p2, line2B: p3,
      center: midpointOf(midpointOf(p0, p1), midpointOf(p2, p3)), type,
    };
  }
  return null;
}

const lineYAtX = (a, b, x) => {
  if (Math.abs(b.x - a.x) < 1e-6) return null;
  return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
};

// Screen-space hit test shared by hover, selection and editing: any rendered
// line (extended per the drawing's flags) within threshold, or the filled
// band between the two lines.
export function channelHitTest(drawing, point, transform, threshold = 7) {
  const geo = channelGeometry(drawing, transform);
  if (!geo) return false;
  const style = drawing.style || {};
  const extendLeft = style.extendLeft !== false;
  const extendRight = style.extendRight !== false;
  const lineHit = (a, b) => distanceToSegment(point, a, b) <= threshold;
  if (geo.type === 'parallelChannel' || geo.type === 'regressionChannel') {
    if (!geo.offA) return lineHit(geo.baseA, geo.baseB);
    const base = extendLine(geo.baseA, geo.baseB, extendLeft, extendRight);
    const off = extendLine(geo.offA, geo.offB, extendLeft, extendRight);
    if (lineHit(base.a, base.b) || lineHit(off.a, off.b)) return true;
    return inBand(point, base, off, threshold);
  }
  if (geo.type === 'linearRegressionChannel') {
    const upper = extendLine(geo.upperA, geo.upperB, extendLeft, extendRight);
    const lower = extendLine(geo.lowerA, geo.lowerB, extendLeft, extendRight);
    if (lineHit(upper.a, upper.b) || lineHit(lower.a, lower.b)) return true;
    return inBand(point, upper, lower, threshold);
  }
  if (geo.type === 'flatTopChannel' || geo.type === 'flatBottomChannel') {
    const xs = [geo.flatPoint.x, geo.slopeA.x, geo.slopeB.x];
    const flat = extendFlat(geo.flatPoint.y, xs, extendLeft, extendRight);
    const slope = extendLine(geo.slopeA, geo.slopeB, extendLeft, extendRight);
    if (lineHit(flat.a, flat.b) || lineHit(slope.a, slope.b)) return true;
    return inBand(point, flat, slope, threshold);
  }
  if (geo.type === 'disjointChannel') {
    const l1 = extendLine(geo.line1A, geo.line1B, extendLeft, extendRight);
    const l2 = extendLine(geo.line2A, geo.line2B, extendLeft, extendRight);
    if (lineHit(l1.a, l1.b) || lineHit(l2.a, l2.b)) return true;
    return inBand(point, l1, l2, threshold);
  }
  return false;
}

// Point between two lines at its x position (with threshold slack).
function inBand(point, lineA, lineB, threshold) {
  const y1 = lineYAtX(lineA.a, lineA.b, point.x);
  const y2 = lineYAtX(lineB.a, lineB.b, point.x);
  if (y1 == null || y2 == null) return false;
  return point.y >= Math.min(y1, y2) - threshold && point.y <= Math.max(y1, y2) + threshold;
}
