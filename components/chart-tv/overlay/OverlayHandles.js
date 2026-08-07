'use client';
import { HandleRenderer } from '@/components/chart/renderers/HandleRenderer';
import { handleGeometry, nearestHandle } from '@/components/chart/interaction/HandleGeometry';

// Handles layer: reuses the legacy HandleRenderer (blue #2962ff round/square
// handles, hover fill, rotation dashes, curve control-point guides) painted
// for the selected drawings only, so the layer cost scales with the
// selection, not the drawing count.
export function createOverlayHandles({ canvas, getTransform, getDrawings, getSelection, getHover, getPointEditId }) {
  const ctx = canvas?.getContext('2d') || null;
  const paint = () => {
    if (!ctx) return;
    const selected = (getSelection?.()?.ids() || [])
      .map((id) => getDrawings().find((item) => item.id === id))
      .filter(Boolean);
    if (!selected.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    const paintFn = HandleRenderer({
      drawings: selected,
      transform: getTransform(),
      hover: getHover?.() || null,
      visible: true,
      pointEditId: getPointEditId?.() || null,
    });
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintFn(ctx);
    ctx.restore();
  };
  const clear = () => { ctx?.clearRect(0, 0, canvas.width, canvas.height); };
  return { paint, clear, geometry: handleGeometry, nearest: nearestHandle };
}
