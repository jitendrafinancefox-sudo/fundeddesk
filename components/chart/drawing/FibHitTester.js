'use client';

// FibHitTester — screen-space hit testing and handle geometry for every
// Fibonacci tool. Hit behavior mirrors the renderer: whatever is painted is
// hittable (level lines, channel lines, fan rays, spiral arcs, time-zone
// lines), with a small threshold slack. Level lines that extend past the
// anchors are reachable even when the anchors are far off-screen — the
// engine's hitZone sweep covers those (same pattern as zones/channels).
//
// Handle geometry: anchors for every tool (2 or 3), a midpoint (move) on
// the base line, a center marker, and a width handle on the channel's
// offset line — matching how channel handles behave.

import { distanceToSegment } from './GeometryPrimitives';
import { fibGeometry } from './FibGeometry';

const HORIZONTAL_TYPES = ['fib', 'fibExtension', 'fibProjection'];

const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function fibHandleGeometry(drawing, transform) {
  const anchors = drawing.anchorPoints
    .map((anchor, index) => { const point = transform.anchorToPixel(anchor); return point ? { x: point.x, y: point.y, index } : null; })
    .filter(Boolean);
  const geometry = { anchors };
  if (anchors.length < 2) return geometry;
  geometry.midpoint = midpointOf(anchors[0], anchors[1]);
  const geo = fibGeometry(drawing, transform);
  if (!geo) return geometry;
  geometry.center = geo.center || geometry.midpoint;
  if (geo.widthHandle) geometry.widthHandle = geo.widthHandle;
  return geometry;
}

function inArc(point, arc, threshold) {
  const dx = point.x - arc.center.x; const dy = point.y - arc.center.y;
  const radial = Math.abs(Math.hypot(dx, dy) - arc.radius);
  if (radial > threshold) return false;
  const angle = Math.atan2(dy, dx);
  const rel = ((angle - arc.start) + Math.PI * 4) % (Math.PI * 2);
  const sweep = ((arc.end - arc.start) + Math.PI * 4) % (Math.PI * 2);
  return rel <= sweep + 0.02 || rel >= Math.PI * 2 - sweep - 0.02;
}

export function fibHitTest(drawing, point, transform, threshold = 7) {
  const geometry = fibGeometry(drawing, transform);
  if (!geometry) return false;
  const style = drawing.style || {};
  const { type } = geometry;
  if (HORIZONTAL_TYPES.includes(type)) {
    let onLine = false;
    geometry.levelLines.forEach((line) => {
      if (!line.enabled) return;
      if (point.x >= line.x1 - threshold && point.x <= line.x2 + threshold && Math.abs(point.y - line.y) <= threshold) onLine = true;
    });
    if (onLine) return true;
    if (style.fill !== false) {
      const ys = geometry.levelLines.filter((line) => line.enabled).map((line) => line.y);
      if (ys.length >= 2) {
        const top = Math.min(...ys); const bottom = Math.max(...ys);
        if (point.y >= top && point.y <= bottom) return true;
      }
    }
    return false;
  }
  if (type === 'fibFan') {
    return geometry.rays.some((ray) => ray.enabled && distanceToSegment(point, ray.a, ray.b) <= threshold);
  }
  if (type === 'fibChannel') {
    let hit = geometry.levelLines.some((line) => line.enabled && distanceToSegment(point, line.a, line.b) <= threshold);
    if (!hit && style.fill !== false && geometry.baseA && geometry.offA) {
      const baseY = (point.x - geometry.baseA.x) * (geometry.baseB.y - geometry.baseA.y) / (geometry.baseB.x - geometry.baseA.x || 1) + geometry.baseA.y;
      const offY = (point.x - geometry.offA.x) * (geometry.offB.y - geometry.offA.y) / (geometry.offB.x - geometry.offA.x || 1) + geometry.offA.y;
      hit = point.y >= Math.min(baseY, offY) && point.y <= Math.max(baseY, offY);
    }
    return hit;
  }
  if (type === 'fibSpiral') {
    return geometry.arcs.some((arc) => inArc(point, arc, threshold));
  }
  if (type === 'fibTimeZone') {
    return geometry.lines.some((line) => line.enabled && Math.abs(point.x - line.x) <= threshold);
  }
  return false;
}
