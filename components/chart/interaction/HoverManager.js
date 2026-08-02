'use client';

// Tracks what is under the pointer (drawing + handle kind) so rendering and
// the cursor can react instantly. Pure observer: never mutates drawings.
// Hover changes are only published when the target actually changes, which
// keeps invalidations (and therefore repaints) at the minimum rate.
export function createHoverManager({ hitTestEngine, engine, bus }) {
  let hover = null;
  const same = (a, b) => Boolean(a && b && a.id === b.id && a.kind === b.kind && a.anchorIndex === b.anchorIndex);
  const setHover = (next) => {
    if (same(hover, next)) return hover;
    hover = next;
    engine?.setHover(hover);
    bus?.emit('hover:changed', hover);
    return hover;
  };
  return {
    update(point) { return setHover(hitTestEngine.hit(point)); },
    clear() { return setHover(null); },
    getHover() { return hover; },
  };
}
