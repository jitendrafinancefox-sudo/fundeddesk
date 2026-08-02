'use client';

// Screen-space handle positions for a drawing, shared by hit testing,
// hover feedback and handle rendering so all three always agree on where
// the handles are. Pure functions; no canvas or engine dependencies.
//
// Line tools expose end anchors (+ midpoint and rotation handle for
// single-segment tools). Shape tools expose corner anchors, mid-edge
// handles, a center move handle and a rotation handle (rotation-ready:
// a rotate action only needs the position and the existing pixelToAnchor
// round-trip to convert screen rotation back into market coordinates).
// Channel tools expose their anchors plus a width handle on the offset
// line, a center move handle, a midpoint (base line) and a rotation handle.
import { polygonCorners, polygonCenter, polygonEdges, polygonRotation, rotatePoint } from '../drawing/ShapeGeometry';
import { channelGeometry, projectPointOnLine, lineNormal } from '../drawing/ChannelGeometry';
import { DRAWING_DEFINITIONS } from '../drawing/DrawingDefinitions';

const ROTATABLE_TOOLS = new Set(['trend', 'ray', 'extended', 'measure', 'arrow']);
const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function handleGeometry(drawing, transform) {
  const anchors = drawing.anchorPoints
    .map((anchor, index) => { const point = transform.anchorToPixel(anchor); return point ? { x: point.x, y: point.y, index } : null; })
    .filter(Boolean);
  const def = DRAWING_DEFINITIONS[drawing.drawingType];
  if (def?.shape) {
    const corners = polygonCorners(anchors);
    const edges = polygonEdges(corners);
    const center = polygonCenter(corners);
    const rotatable = def.rotatable !== false;
    const topEdge = edges[0];
    return {
      shape: true, corners: corners.map((p, i) => ({ x: p.x, y: p.y, index: i })),
      edges, center,
      rotation: rotatable ? { x: topEdge.mid.x + topEdge.nx * 22, y: topEdge.mid.y + topEdge.ny * 22 } : null,
      rotatable, angle: polygonRotation(corners),
    };
  }
  const geometry = { anchors, midpoint: null, rotation: null, rotatable: false, channel: false };
  if (def?.channel) {
    geometry.channel = true;
    const geo = channelGeometry(drawing, transform);
    if (geo?.baseA && geo?.baseB) {
      const baseMid = midpointOf(geo.baseA, geo.baseB);
      geometry.midpoint = baseMid;
      if (geo.offA && geo.offB) geometry.widthHandle = projectPointOnLine(baseMid, geo.offA, geo.offB);
      if (geo.center) geometry.center = geo.center;
      if (def.rotatable !== false) {
        const n = lineNormal(geo.baseA, geo.baseB);
        geometry.rotation = { x: baseMid.x + n.nx * 22, y: baseMid.y + n.ny * 22 };
        geometry.rotatable = true;
      }
      return geometry;
    }
    if (geo?.type === 'flatTopChannel' || geo?.type === 'flatBottomChannel') {
      if (geo.flatPoint && geo.slopeA && geo.slopeB) {
        geometry.center = geo.center || midpointOf(midpointOf(geo.flatPoint, geo.slopeB), midpointOf(geo.slopeA, geo.slopeB));
        geometry.midpoint = midpointOf(geo.slopeA, geo.slopeB);
      }
      return geometry;
    }
    return geometry;
  }
  if (anchors.length >= 2) {
    const a = anchors[0]; const b = anchors[1];
    geometry.midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (ROTATABLE_TOOLS.has(drawing.drawingType)) {
      const dx = b.x - a.x; const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      geometry.rotation = { x: geometry.midpoint.x + (-dy / length) * 22, y: geometry.midpoint.y + (dx / length) * 22 };
      geometry.rotatable = true;
    }
  }
  return geometry;
}

// Nearest handle of a drawing within `threshold` pixels of the point, or
// null. Kinds: rotation > center > edge > corner (shapes) and
// rotation > midpoint > anchors (lines) — nearest wins. Anchors/edges carry
// their index; the full geometry rides along so callers skip a second pass.
export function nearestHandle(drawing, point, transform, threshold = 9) {
  const geometry = handleGeometry(drawing, transform);
  let best = null; let bestDistance = threshold;
  const consider = (kind, index, x, y) => {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance <= bestDistance) { bestDistance = distance; best = { kind, index, x, y, geometry }; }
  };
  if (geometry.rotation) consider('rotation', -1, geometry.rotation.x, geometry.rotation.y);
  if (geometry.widthHandle) consider('width', -1, geometry.widthHandle.x, geometry.widthHandle.y);
  if (geometry.shape) {
    consider('center', -1, geometry.center.x, geometry.center.y);
    geometry.edges.forEach((edge, i) => consider('edge', i, edge.mid.x, edge.mid.y));
    geometry.corners.forEach((corner) => consider('anchor', corner.index, corner.x, corner.y));
  } else if (geometry.channel || geometry.center) {
    if (geometry.center) consider('center', -1, geometry.center.x, geometry.center.y);
    if (geometry.midpoint) consider('midpoint', -1, geometry.midpoint.x, geometry.midpoint.y);
    geometry.anchors.forEach((anchor) => consider('anchor', anchor.index, anchor.x, anchor.y));
  } else {
    if (geometry.midpoint) consider('midpoint', -1, geometry.midpoint.x, geometry.midpoint.y);
    geometry.anchors.forEach((anchor) => consider('anchor', anchor.index, anchor.x, anchor.y));
  }
  return best;
}

// Rotation handle position for a shape (used by rotation actions).
export function shapeRotationHandle(edges) {
  const topEdge = edges[0];
  return { x: topEdge.mid.x + topEdge.nx * 22, y: topEdge.mid.y + topEdge.ny * 22 };
}

export function rotateAbout(points, center, angle) { return points.map((p) => rotatePoint(p, center, angle)); }
