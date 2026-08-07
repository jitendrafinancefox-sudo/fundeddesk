'use client';
import { createHitTestEngine } from '@/components/chart/interaction/HitTestEngine';

// Reuses the legacy hit-test engine untouched: handle-priority hit testing
// (rotation > midpoint > anchor), topmost-first body sweep, locked/hidden
// exclusion, and the zone/channel/stroke/fib/position sweep for extended
// bands that reach beyond the time-bounded candidate window.
export function createOverlayHitTest({ registry, getTransform, layers }) {
  const engine = createHitTestEngine({ registry, getTransform, layers });
  return {
    ...engine,
    hit(point, options) { return engine.hit(point, options); },
    hitZone(point, options) { return engine.hitZone(point, options); },
  };
}
