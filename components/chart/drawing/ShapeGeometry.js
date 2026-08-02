'use client';
import { distanceToSegment } from './GeometryEngine';

// Pure screen-space polygon math for shape tools (rect, rotated rect,
// circle, ellipse, triangle, zones). Shapes are stored as corner anchors in
// data coordinates; every edit here runs in screen space and is converted
// back through pixelToAnchor, so handles stay attached to candles and the
// round-trip is exact (verified in Phase 3).
//
// Corner order: TL, TR, BR, BL for box shapes; TL, TR, bottom for triangle.

// Expand a 2-anchor drag diagonal into a box; pass through real corners.
export function polygonCorners(points) {
  if (points.length === 2) {
    const left = Math.min(points[0].x, points[1].x); const right = Math.max(points[0].x, points[1].x);
    const top = Math.min(points[0].y, points[1].y); const bottom = Math.max(points[0].y, points[1].y);
    return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
  }
  return points.map((p) => ({ x: p.x, y: p.y }));
}

export function polygonBounds(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach((p) => { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function polygonCenter(points) {
  let x = 0, y = 0;
  points.forEach((p) => { x += p.x; y += p.y; });
  return { x: x / points.length, y: y / points.length };
}

// Edge midpoints with outward normals (away from the polygon center).
export function polygonEdges(points) {
  const center = polygonCenter(points);
  return points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    let nx = -(b.y - a.y); let ny = b.x - a.x;
    const length = Math.hypot(nx, ny) || 1; nx /= length; ny /= length;
    if ((mid.x - center.x) * nx + (mid.y - center.y) * ny < 0) { nx = -nx; ny = -ny; }
    return { a, b, mid, nx, ny };
  });
}

// Current rotation = angle of the first edge (TL→TR for boxes).
export function polygonRotation(points) {
  if (points.length < 2) return 0;
  return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
}

export function rotatePoint(point, center, angle) {
  const dx = point.x - center.x; const dy = point.y - center.y;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function rotatePoints(points, center, angle) { return points.map((p) => rotatePoint(p, center, angle)); }

// Corner resize for box shapes: the opposite corner stays fixed and the
// dragged corner follows the pointer inside the rotated frame, so rotation
// is preserved while width AND height change.
export function resizeBox(corners, index, pointer) {
  const center = polygonCenter(corners);
  const theta = polygonRotation(corners);
  const opposite = corners[(index + 2) % corners.length];
  const p = rotatePoint(pointer, center, -theta);
  const o = rotatePoint(opposite, center, -theta);
  const left = Math.min(o.x, p.x); const right = Math.max(o.x, p.x);
  const top = Math.min(o.y, p.y); const bottom = Math.max(o.y, p.y);
  return rotatePoints([{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }], center, theta);
}

// Square box (circle): side = max extent, anchored at the dragged corner.
export function resizeSquare(corners, index, pointer) {
  const center = polygonCenter(corners);
  const theta = polygonRotation(corners);
  const opposite = corners[(index + 2) % corners.length];
  const p = rotatePoint(pointer, center, -theta);
  const o = rotatePoint(opposite, center, -theta);
  const side = Math.max(Math.abs(p.x - o.x), Math.abs(p.y - o.y));
  const left = (index === 0 || index === 3) ? o.x : o.x - side;
  const top = (index === 0 || index === 1) ? o.y : o.y - side;
  return rotatePoints([{ x: left, y: top }, { x: left + side, y: top }, { x: left + side, y: top + side }, { x: left, y: top + side }], center, theta);
}

// Mid-edge resize: translate the edge's two corners along its outward
// normal, so only ONE axis changes.
export function resizeEdge(corners, edgeIndex, pointer, edges) {
  const edge = edges[edgeIndex];
  const delta = (pointer.x - edge.mid.x) * edge.nx + (pointer.y - edge.mid.y) * edge.ny;
  const dx = edge.nx * delta; const dy = edge.ny * delta;
  const next = corners.map((p) => ({ x: p.x, y: p.y }));
  next[edgeIndex] = { x: next[edgeIndex].x + dx, y: next[edgeIndex].y + dy };
  next[(edgeIndex + 1) % next.length] = { x: next[(edgeIndex + 1) % next.length].x + dx, y: next[(edgeIndex + 1) % next.length].y + dy };
  return next;
}

// Free corner move (triangle reshape).
export function moveCorner(corners, index, pointer) {
  return corners.map((p, i) => (i === index ? { x: pointer.x, y: pointer.y } : { x: p.x, y: p.y }));
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]; const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function distanceToPolygon(point, polygon) {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const d = distanceToSegment(point, polygon[i], polygon[(i + 1) % polygon.length]);
    if (d < min) min = d;
  }
  return min;
}
