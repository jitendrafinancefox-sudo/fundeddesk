'use client';
import { anchorsRect, padRect, rectFromPoints, unionRect } from './GeometryEngine';

// Drawing layers: z-order is the registry order (last = topmost); a per-layer
// visibility set keeps hidden drawings out of the render pass. Also computes
// dirty rectangles so overlay-only changes repaint a small region instead of
// the whole canvas.
export function createLayerManager({ engine, registry } = {}) {
  const hidden = new Set(); // layer ids (drawing ids) currently hidden
  let hoverId = null;
  return {
    hide(id) { hidden.add(id); engine?.pipeline.invalidate('full'); },
    show(id) { hidden.delete(id); engine?.pipeline.invalidate('full'); },
    isHidden(id) { return hidden.has(id); },
    hiddenIds() { return [...hidden]; },
    // Filter a drawing list by visibility AND z-order (registry order).
    visibleDrawings(drawings) { return drawings.filter((drawing) => !hidden.has(drawing.id)); },
    // Dirty-rect for a single drawing that changed between `before` and
    // `after` (screen-space). Union of both bounds so the old position is
    // also repainted. Returns null when either side is off-screen (caller
    // should then invalidate the full frame).
    dirtyRect(before, after, transform) {
      const beforeRect = anchorsRect(before?.anchorPoints || [], transform);
      const afterRect = anchorsRect(after?.anchorPoints || [], transform);
      if (!beforeRect || !afterRect) return null;
      return padRect(unionRect(beforeRect, afterRect), 3);
    },
    // Invalidates the union of both bounds; falls back to a full invalidate
    // when either side is off-screen. Returns the rect (or null for full).
    invalidateDrawing(before, after, transform) {
      const rect = this.dirtyRect(before, after, transform);
      if (rect) engine?.pipeline.invalidate('rect', rect); else engine?.pipeline.invalidate('full');
      return rect;
    },
    // Dirty-rect for a marquee rect (selection overlay).
    invalidateRect(rect) { if (rect) engine?.pipeline.invalidate('rect', padRect(rect, 3)); },
    setHover(id) { hoverId = id; },
    getHover() { return hoverId; },
    allVisibleRect(drawings, transform) {
      const rects = drawings.map((drawing) => anchorsRect(drawing.anchorPoints, transform)).filter(Boolean);
      return rects.reduce((acc, rect) => unionRect(acc, rect), null);
    },
  };
}
