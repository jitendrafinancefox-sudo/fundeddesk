'use client';
import { resolveCursor, createCursorManager } from '@/components/chart/interaction/CursorManager';

// Reuses the legacy cursor vocabulary untouched (grab/grabbing/crosshair/
// move/resize/rotate/text/brush cursors), applied imperatively on the
// overlay host so cursor changes never trigger React re-renders.
export { resolveCursor };
export function createOverlayCursor({ container }) {
  const manager = createCursorManager({ canvas: container });
  return {
    apply(context) { manager.apply(context); },
    get() { return manager.get(); },
    clear() { if (container) container.style.cursor = ''; },
  };
}
