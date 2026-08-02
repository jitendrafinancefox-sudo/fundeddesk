'use client';

// FibGeometry — pure screen-space geometry for every Fibonacci tool.
//
// Like ChannelGeometry, anchors live in market coordinates and everything is
// reduced to pixel geometry here so renderers, hit testers and handle
// geometry all agree. A `bounds` parameter (canvas size) drives level-line
// extents; when omitted a wide margin is assumed so hit testing works
// regardless of viewport. The returned geometry carries `cullingBounds` — a
// conservative pixel rect the render pipeline uses to keep off-screen
// Fibonacci objects out of the frame (the 10k+ requirement).
//
// Level math:
//   retracement / extension   price = p0 + (p1 - p0) * level
//   projection                price = p2 + (p1 - p0) * level   (p0→p1 impulse, p2 retracement)
//   fan                       ray slope = level * trend slope   (0 = horizontal, 1 = trend line)
//   channel                   parallel line at level * width from the base line
//   spiral                    golden-ratio arcs alternating about the two foci
//   timezone                  vertical line at t0 + interval * level

import { lineNormal, projectPointOnLine } from './ChannelGeometry';
import { fibLevelManager } from './FibLevelManager';

const MARGIN = 20000;
const HORIZONTAL_TYPES = ['fib', 'fibExtension', 'fibProjection'];

export const isFibType = (drawingType) => ['fib', 'fibExtension', 'fibProjection', 'fibFan', 'fibChannel', 'fibSpiral', 'fibTimeZone'].includes(drawingType);

const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Horizontal span of level lines: full width (canvas edges) when the extend
// flags are on (default), the anchor span otherwise.
function levelSpan(drawing, bounds) {
  const style = drawing.style || {};
  const extendLeft = style.extendLeft !== false;
  const extendRight = style.extendRight !== false;
  const width = bounds?.width ?? MARGIN * 4;
  return { x1: extendLeft ? -MARGIN : 0, x2: extendRight ? width + MARGIN : width };
}

export function fibGeometry(drawing, transform, bounds) {
  const type = drawing.drawingType;
  const anchors = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
  if (!anchors.length) return null;
  const [p0, p1, p2] = anchors;
  const levels = fibLevelManager.levelsFor(drawing);
  const style = drawing.style || {};
  const geometry = { type, anchors, levels, style };

  if (HORIZONTAL_TYPES.includes(type)) {
    if (!p0 || !p1) return null;
    const span = levelSpan(drawing, bounds);
    if (type === 'fibProjection') {
      if (!p2) return null;
      geometry.base = p2; geometry.step = p1.y - p0.y;
    } else {
      geometry.base = p0; geometry.step = p1.y - p0.y;
    }
    const price = (level) => geometry.base.y + geometry.step * level;
    geometry.levelLines = levels.map((level) => ({ ...level, y: price(level.value), x1: span.x1, x2: span.x2 }));
    const ys = geometry.levelLines.filter((line) => line.enabled).map((line) => line.y);
    geometry.minY = ys.length ? Math.min(...ys) : Math.min(geometry.base.y, geometry.base.y + geometry.step);
    geometry.maxY = ys.length ? Math.max(...ys) : Math.max(geometry.base.y, geometry.base.y + geometry.step);
    geometry.midpoint = midpointOf(p0, p1);
    geometry.center = { x: (span.x1 + span.x2) / 2, y: (geometry.minY + geometry.maxY) / 2 };
    geometry.cullingBounds = { x: span.x1, y: geometry.minY, width: span.x2 - span.x1, height: geometry.maxY - geometry.minY };
    return geometry;
  }

  if (type === 'fibFan') {
    if (!p0 || !p1) return null;
    const dx = p1.x - p0.x; const dy = p1.y - p0.y;
    const baseSlope = Math.abs(dx) > 1e-6 ? dy / dx : 0;
    const span = levelSpan(drawing, bounds);
    geometry.origin = p0;
    geometry.rays = levels.map((level) => {
      const slope = baseSlope * level.value;
      const x2 = span.x2;
      const b = { x: x2, y: p0.y + slope * (x2 - p0.x) };
      const a = { x: p0.x, y: p0.y };
      return { ...level, a, b, slope };
    });
    const rayYs = geometry.rays.map((ray) => ray.b.y);
    geometry.minY = Math.min(p0.y, ...rayYs); geometry.maxY = Math.max(p0.y, ...rayYs);
    geometry.midpoint = midpointOf(p0, p1);
    geometry.center = p0;
    geometry.cullingBounds = { x: span.x1, y: geometry.minY, width: span.x2 - span.x1, height: geometry.maxY - geometry.minY };
    return geometry;
  }

  if (type === 'fibChannel') {
    if (!p0 || !p1) return null;
    if (!p2) {
      geometry.baseA = p0; geometry.baseB = p1; geometry.midpoint = midpointOf(p0, p1); geometry.center = geometry.midpoint;
      geometry.cullingBounds = { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y), width: Math.abs(p1.x - p0.x), height: Math.abs(p1.y - p0.y) };
      return geometry;
    }
    const n = lineNormal(p0, p1);
    const width = (p2.x - p0.x) * n.nx + (p2.y - p0.y) * n.ny;
    const baseMid = midpointOf(p0, p1);
    const at = (level) => ({ x: baseMid.x + n.nx * width * level, y: baseMid.y + n.ny * width * level });
    const offset = (point) => ({ x: point.x + (p1.x - p0.x), y: point.y + (p1.y - p0.y) });
    geometry.baseA = p0; geometry.baseB = p1; geometry.offA = p2; geometry.offB = offset(p2);
    geometry.n = n; geometry.width = width; geometry.center = at(0.5);
    geometry.midpoint = baseMid;
    geometry.widthHandle = projectPointOnLine(baseMid, p2, offset(p2));
    geometry.levelLines = levels.map((level) => {
      const mid = at(level.value);
      return { ...level, a: mid, b: offset(mid) };
    });
    const lineY = geometry.levelLines.map((line) => [line.a.y, line.b.y]).flat();
    geometry.minY = Math.min(...lineY); geometry.maxY = Math.max(...lineY);
    geometry.cullingBounds = { x: Math.min(p0.x, p1.x, p2.x) - MARGIN, y: geometry.minY, width: Math.abs(p1.x - p0.x) + MARGIN * 2, height: geometry.maxY - geometry.minY };
    return geometry;
  }

  if (type === 'fibSpiral') {
    if (!p0 || !p1) return null;
    const PHI = 1.61803398875;
    const baseLen = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    const startAngle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
    const arcs = [];
    let center = p1; let radius = baseLen; let angle = startAngle;
    const sweep = Math.PI / 2;
    for (let i = 0; i < 6; i += 1) {
      arcs.push({ center, radius, start: angle, end: angle + sweep, value: radius / baseLen });
      angle += sweep;
      center = center === p1 ? p0 : p1;
      radius *= PHI;
    }
    // Two inward arcs (radius / PHI, / PHI²) complete the classic look.
    radius = baseLen / PHI; center = p0; angle = startAngle - sweep;
    for (let i = 0; i < 2; i += 1) {
      arcs.push({ center, radius, start: angle - sweep, end: angle, value: radius / baseLen });
      angle -= sweep;
      center = center === p1 ? p0 : p1;
      radius /= PHI;
    }
    geometry.arcs = arcs;
    const maxRadius = baseLen * PHI ** 5;
    geometry.minY = Math.min(p0.y, p1.y) - maxRadius; geometry.maxY = Math.max(p0.y, p1.y) + maxRadius;
    geometry.midpoint = midpointOf(p0, p1);
    geometry.center = midpointOf(p0, p1);
    geometry.cullingBounds = { x: Math.min(p0.x, p1.x) - maxRadius, y: geometry.minY, width: Math.abs(p1.x - p0.x) + maxRadius * 2, height: geometry.maxY - geometry.minY };
    return geometry;
  }

  if (type === 'fibTimeZone') {
    if (!p0 || !p1) return null;
    const t0 = drawing.anchorPoints[0].time; const t1 = drawing.anchorPoints[1].time;
    const interval = Math.max(1, Math.abs(t1 - t0));
    const direction = t1 >= t0 ? 1 : -1;
    geometry.lines = levels.map((level) => {
      const time = t0 + direction * interval * level.value;
      const point = transform.anchorToPixel({ time, price: drawing.anchorPoints[0].price });
      return { ...level, x: point?.x ?? null, time };
    }).filter((line) => line.x != null);
    const xs = geometry.lines.map((line) => line.x);
    geometry.minX = Math.min(p0.x, p1.x, ...xs); geometry.maxX = Math.max(p0.x, p1.x, ...xs);
    geometry.midpoint = midpointOf(p0, p1);
    geometry.center = geometry.midpoint;
    geometry.cullingBounds = { x: geometry.minX, y: -MARGIN, width: geometry.maxX - geometry.minX, height: MARGIN * 2 };
    return geometry;
  }

  return null;
}
