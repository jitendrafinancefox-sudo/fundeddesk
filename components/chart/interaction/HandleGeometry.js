'use client';

// Screen-space handle positions for a drawing, shared by hit testing,
// hover feedback and handle rendering so all three always agree on where
// the handles are. Pure functions; no canvas or engine dependencies.
//
// Rotation handles are computed for single-segment tools only. The geometry
// is rotation-ready: a future rotate action only needs the position and the
// existing pixelToAnchor round-trip to convert screen rotation back into
// market coordinates.
const ROTATABLE_TOOLS = new Set(['trend', 'ray', 'extended', 'measure', 'arrow']);

export function handleGeometry(drawing, transform) {
  const anchors = drawing.anchorPoints
    .map((anchor, index) => { const point = transform.anchorToPixel(anchor); return point ? { x: point.x, y: point.y, index } : null; })
    .filter(Boolean);
  const geometry = { anchors, midpoint: null, rotation: null, rotatable: false };
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
// null. Rotation > midpoint > anchors only by proximity (nearest wins);
// anchors carry their anchor-point index for the caller.
export function nearestHandle(drawing, point, transform, threshold = 9) {
  const geometry = handleGeometry(drawing, transform);
  let best = null; let bestDistance = threshold;
  const consider = (kind, index, x, y) => {
    const distance = Math.hypot(x - point.x, y - point.y);
    if (distance <= bestDistance) { bestDistance = distance; best = { kind, index, x, y }; }
  };
  if (geometry.rotation) consider('rotation', -1, geometry.rotation.x, geometry.rotation.y);
  if (geometry.midpoint) consider('midpoint', -1, geometry.midpoint.x, geometry.midpoint.y);
  geometry.anchors.forEach((anchor) => consider('anchor', anchor.index, anchor.x, anchor.y));
  return best;
}
