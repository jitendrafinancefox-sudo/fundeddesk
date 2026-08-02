'use client';
import { drawingHit } from '../drawing/GeometryEngine';
import { nearestHandle } from './HandleGeometry';

// Priority-ordered hit testing shared by hover, selection and editing.
// Handles (rotation > midpoint > anchor) beat line bodies, and drawings are
// evaluated topmost-first (registry order = z-order). Locked and hidden
// drawings are excluded so they can never be selected or edited.
export function createHitTestEngine({ registry, getTransform, layers }) {
  const threshold = 9;
  const isExcluded = (drawing) => layers?.isHidden(drawing.id) || Boolean(drawing.locked);
  const candidatesAt = (point) => {
    const transform = getTransform(); if (!transform) return [];
    const t0 = transform.pixelToTime(point.x - threshold);
    const t1 = transform.pixelToTime(point.x + threshold);
    return (t0 != null && t1 != null) ? registry.queryRange(Math.min(t0, t1), Math.max(t0, t1)) : registry.ids();
  };
  const project = (drawing) => drawing.anchorPoints.map((anchor) => { const p = getTransform()?.anchorToPixel(anchor); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
  const hit = (point) => {
    const transform = getTransform(); if (!transform) return null;
    const candidates = candidatesAt(point);
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = registry.get(candidates[i]);
      if (!drawing || isExcluded(drawing)) continue;
      const handle = nearestHandle(drawing, point, transform, threshold);
      if (handle) return { id: drawing.id, anchorIndex: handle.index, kind: handle.kind, drawingType: drawing.drawingType, screenPoints: project(drawing) };
    }
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = registry.get(candidates[i]);
      if (!drawing || isExcluded(drawing)) continue;
      if (drawingHit(drawing, point, transform, 7)) return { id: drawing.id, anchorIndex: -1, kind: 'body', drawingType: drawing.drawingType, screenPoints: project(drawing) };
    }
    return null;
  };
  return { hit, threshold, isExcluded };
}
