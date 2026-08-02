'use client';
import { rectFromPoints, rectsOverlap, anchorsRect } from './GeometryEngine';

// Owns the selected drawing ids and the marquee (rubber-band) rectangle.
// Pure state + events: rendering and mutation live elsewhere. Locked and
// hidden drawings can never enter a marquee selection.
export function createSelectionManager({ bus, layers } = {}) {
  const selected = new Set();
  let marquee = null; // { start, current }
  const emit = (event, payload) => bus?.emit(event, payload);
  return {
    ids() { return [...selected]; },
    has(id) { return selected.has(id); },
    count() { return selected.size; },
    select(id, { additive = false } = {}) { if (!additive) selected.clear(); selected.add(id); emit('selection:changed', this.ids()); },
    toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id); emit('selection:changed', this.ids()); },
    clear() { if (selected.size) { selected.clear(); emit('selection:changed', this.ids()); } },
    replace(ids) { selected.clear(); ids.forEach((id) => selected.add(id)); emit('selection:changed', this.ids()); },
    // Remove ids that no longer exist in the registry (e.g. after delete/undo).
    prune(validIds) { const keep = new Set(validIds); let changed = false; [...selected].forEach((id) => { if (!keep.has(id)) { selected.delete(id); changed = true; } }); if (changed) emit('selection:changed', this.ids()); },
    // Marquee — screen-space rubber band.
    marqueeStart(point) { marquee = { start: point, current: point }; emit('selection:marquee', this.marqueeRect()); },
    marqueeMove(point) { if (!marquee) return; marquee.current = point; emit('selection:marquee', this.marqueeRect()); },
    marqueeEnd({ additive = false } = {}) { if (!marquee) return; const rect = this.marqueeRect(); marquee = null; emit('selection:marquee', null); return rect; },
    marqueeCancel() { marquee = null; emit('selection:marquee', null); },
    isMarqueeActive() { return Boolean(marquee); },
    marqueeRect() { if (!marquee) return null; return rectFromPoints([marquee.start, marquee.current]); },
    // Select every drawing whose screen bounds intersect the rect (topmost
    // order preserved). Locked and hidden drawings are skipped. Returns the
    // new selection for callers that need it.
    selectInRect(rect, drawings, transform, { additive = false } = {}) {
      const hits = drawings.filter((drawing) => !drawing.locked && !layers?.isHidden(drawing.id)).filter((drawing) => { const bounds = anchorsRect(drawing.anchorPoints, transform); return bounds && rectsOverlap(bounds, rect); }).map((drawing) => drawing.id);
      if (additive) hits.forEach((id) => selected.add(id)); else { selected.clear(); hits.forEach((id) => selected.add(id)); }
      emit('selection:changed', this.ids());
      return this.ids();
    },
  };
}
