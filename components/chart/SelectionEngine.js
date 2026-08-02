'use client';
export function selectDrawing(drawings, point, transform, threshold = 8) {
  return drawings.find((drawing) => drawing.anchorPoints.some((anchor) => { const p = transform.anchorToPixel(anchor); return p && Math.hypot(p.x - point.x, p.y - point.y) < threshold; }))?.id || null;
}
