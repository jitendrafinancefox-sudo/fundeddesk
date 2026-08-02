'use client';

// Maps interaction context to the mouse cursor. The result is applied
// imperatively on the canvas element so cursor changes never trigger React
// re-renders — pointer events arrive at mousemove rate and a state update
// per event would reconcile the whole component tree for nothing.
//
// Cursor vocabulary: grab/grabbing (pan), crosshair (drawing tools),
// move (drag body/handle), resize h/v/diag (one-anchor and corner handles),
// rotate (rotation handle, custom SVG cursor), text (text tool), pointer
// (clickable), default (idle).
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='8.5' fill='none' stroke='#ffffff' stroke-width='2.2'/><circle cx='12' cy='12' r='7' fill='none' stroke='#4d7cfe' stroke-width='1.4'/><path d='M12 1.8 L14.6 5 L9.4 5 Z' fill='#4d7cfe'/><path d='M12 22.2 L9.4 19 L14.6 19 Z' fill='#4d7cfe'/></svg>")} 12 12, grab`;

export function resolveCursor({ tool, hover, panning = false, axisHover = null }) {
  if (panning) return 'grabbing';
  if (axisHover === 'price') return 'ns-resize';
  if (axisHover === 'time') return 'ew-resize';
  if (tool !== 'cursor') return 'crosshair';
  if (!hover) return 'grab';
  if (hover.kind === 'rotation') return ROTATE_CURSOR;
  if (hover.kind === 'midpoint') return 'move';
  if (hover.kind === 'center') return 'move';
  if (hover.kind === 'body') return 'move';
  if (hover.kind === 'width') return 'ns-resize';
  if (hover.kind === 'edge') {
    const nx = hover.edge?.nx || 0; const ny = hover.edge?.ny || 0;
    return Math.abs(nx) > Math.abs(ny) ? 'ew-resize' : 'ns-resize';
  }
  if (hover.kind === 'anchor') {
    if (hover.shape) {
      if (hover.screenPoints?.length === 4) return (hover.anchorIndex % 2 === 0) ? 'nwse-resize' : 'nesw-resize';
      return 'move';
    }
    const type = hover.drawingType;
    if (type === 'hline') return 'ns-resize';
    if (type === 'vline') return 'ew-resize';
    if ((type === 'rect' || type === 'ellipse') && hover.screenPoints?.length === 2) {
      const a = hover.screenPoints[hover.anchorIndex];
      const b = hover.screenPoints[1 - hover.anchorIndex];
      return (b.x - a.x) * (b.y - a.y) >= 0 ? 'nwse-resize' : 'nesw-resize';
    }
    return 'move';
  }
  return 'default';
}

export function createCursorManager({ canvas }) {
  let current = null;
  const apply = (context) => {
    const cursor = resolveCursor(context);
    if (current === cursor) return;
    current = cursor;
    if (canvas) canvas.style.cursor = cursor;
  };
  return {
    apply,
    get() { return current || 'default'; },
    resolve: resolveCursor,
  };
}
