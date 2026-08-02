'use client';
import { handleGeometry } from '../interaction/HandleGeometry';

// TradingView-style selection handles: square anchor handles on every anchor
// point, a small midpoint handle on two-anchor drawings, and a rotation
// handle above single-segment drawings (geometry is ready; rotation drag is
// wired in DrawingInteraction). The hovered handle scales up and inverts so
// the pointer target is unambiguous. Handles are only painted for selected
// drawings while no drawing tool is being placed.
export function HandleRenderer({ drawings = [], transform, hover = null, visible = true }) {
  return (ctx) => {
    if (!visible || !drawings.length) return;
    ctx.save();
    const isHovered = (drawingId, kind, index) => Boolean(hover && hover.id === drawingId && hover.kind === kind && (kind !== 'anchor' || hover.anchorIndex === index));
    const square = (x, y, size, filled) => {
      ctx.beginPath(); ctx.rect(x - size / 2, y - size / 2, size, size);
      if (filled) { ctx.fill(); ctx.stroke(); } else { ctx.stroke(); }
    };
    drawings.forEach((drawing) => {
      const geometry = handleGeometry(drawing, transform);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
      ctx.lineWidth = 1.5;
      geometry.anchors.forEach((anchor) => {
        const active = isHovered(drawing.id, 'anchor', anchor.index);
        ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
        ctx.strokeStyle = '#4d7cfe';
        square(anchor.x, anchor.y, active ? 9 : 7, true);
      });
      if (geometry.midpoint) {
        const active = isHovered(drawing.id, 'midpoint', -1);
        ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
        ctx.strokeStyle = '#4d7cfe';
        square(geometry.midpoint.x, geometry.midpoint.y, active ? 7 : 5, true);
      }
      if (geometry.rotation) {
        const active = isHovered(drawing.id, 'rotation', -1);
        ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
        ctx.strokeStyle = '#4d7cfe';
        ctx.beginPath(); ctx.arc(geometry.rotation.x, geometry.rotation.y, active ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  };
}
