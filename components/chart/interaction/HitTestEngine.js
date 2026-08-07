'use client';
import { drawingHit } from '../drawing/GeometryEngine';
import { nearestHandle } from './HandleGeometry';
import { isZoneType, isChannelType, isFibType, isStrokeType, isPositionType, isTextType, hitTestDrawing } from '../drawing/DrawingDefinitions';

// Priority-ordered hit testing shared by hover, selection and editing.
// Handles (rotation > midpoint > anchor) beat line bodies, and drawings are
// evaluated topmost-first (registry order = z-order). Locked and hidden
// drawings are excluded so they can never be selected or edited.
export function createHitTestEngine({ registry, getTransform, layers }) {
  const threshold = 9;
  let pointEditId = null;
  const setPointEditId = (id) => { pointEditId = id; };
  const isExcluded = (drawing, ignoreLock) => layers?.isHidden(drawing.id) || Boolean(drawing.hidden) || (Boolean(drawing.locked) && !ignoreLock);
  const candidatesAt = (point) => {
    const transform = getTransform(); if (!transform) return [];
    const t0 = transform.pixelToTime(point.x - threshold);
    const t1 = transform.pixelToTime(point.x + threshold);
    return (t0 != null && t1 != null) ? registry.queryRange(Math.min(t0, t1), Math.max(t0, t1)) : registry.ids();
  };
  // Strokes can span 100k anchors; only a bounded sample is projected for
  // the outline / context-menu hit visualization.
  const project = (drawing) => {
    if (drawing.anchorPoints.length <= 12) {
      return drawing.anchorPoints.map((anchor) => { const p = getTransform()?.anchorToPixel(anchor); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
    }
    const step = Math.ceil(drawing.anchorPoints.length / 11);
    const samples = drawing.anchorPoints.filter((_, i) => i % step === 0);
    samples.push(drawing.anchorPoints[drawing.anchorPoints.length - 1]);
    return samples.map((anchor) => { const p = getTransform()?.anchorToPixel(anchor); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
  };
  const describe = (drawing, handle) => ({
    id: drawing.id, anchorIndex: handle.index, kind: handle.kind,
    drawingType: drawing.drawingType,
    screenPoints: handle.geometry?.corners || project(drawing),
    edge: handle.kind === 'edge' ? handle.geometry?.edges?.[handle.index] || null : null,
    shape: Boolean(handle.geometry?.shape),
    from: handle.from ?? null, to: handle.to ?? null,
  });
  // `ignoreLock` lets the context menu and properties panel target locked
  // objects (they must stay discoverable, just not editable by drag).
  const hit = (point, { ignoreLock = false } = {}) => {
    const transform = getTransform(); if (!transform) return null;
    const candidates = candidatesAt(point);
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = registry.get(candidates[i]);
      if (!drawing || isExcluded(drawing, ignoreLock)) continue;
      const handle = nearestHandle(drawing, point, transform, threshold, { pointEdit: drawing.id === pointEditId });
      if (handle) return describe(drawing, handle);
    }
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = registry.get(candidates[i]);
      if (!drawing || isExcluded(drawing, ignoreLock)) continue;
      if (drawingHit(drawing, point, transform, 7)) return { id: drawing.id, anchorIndex: -1, kind: 'body', drawingType: drawing.drawingType, screenPoints: project(drawing), edge: null, shape: false };
    }
    return null;
  };
  // Extended zones and channels paint beyond their anchor span, where the
  // time-bounded spatial candidates can never find them. Strokes also get a
  // sweep pass: brush/eraser bodies follow their own geometry rather than
  // straight anchor segments, so only the family hit test can judge them.
  // This sweep tests those drawings directly (topmost-first). It is
  // intentionally not part of `hit`: per-move hover must stay O(candidates),
  // while pointer presses are infrequent enough to afford the O(zones)
  // sweep.
  const hitZone = (point, { ignoreLock = false } = {}) => {
    const transform = getTransform(); if (!transform) return null;
    const ids = registry.ids();
    for (let i = ids.length - 1; i >= 0; i -= 1) {
      const drawing = registry.get(ids[i]);
      if (!drawing || isExcluded(drawing, ignoreLock)) continue;
      if (!(isZoneType(drawing.drawingType) || isChannelType(drawing.drawingType) || isFibType(drawing.drawingType) || isStrokeType(drawing.drawingType) || isPositionType(drawing.drawingType) || isTextType(drawing.drawingType))) continue;
      if (hitTestDrawing(drawing, point, transform, 7)) {
        return { id: drawing.id, anchorIndex: -1, kind: 'body', drawingType: drawing.drawingType, screenPoints: project(drawing), edge: null, shape: false };
      }
    }
    return null;
  };
  return { hit, hitZone, threshold, isExcluded, setPointEditId };
}
