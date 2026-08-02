'use client';
import { renderDrawing, isZoneType, isChannelType } from '../drawing/DrawingDefinitions';
export function DrawingRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  return (ctx) => {
    drawings.forEach((drawing) => {
      if (isZoneType(drawing.drawingType) || isChannelType(drawing.drawingType)) return; // zones/channels render on their own threads
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (!points.length) return;
      const [a, b = a] = points;
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      ctx.save();
      ctx.strokeStyle = isSelected ? '#4d7cfe' : isHovered ? '#9cc3ff' : (drawing.style?.color || '#f5b93e');
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = (drawing.style?.lineWidth || 1.5) + (isHovered ? 1 : 0);
      renderDrawing(ctx, drawing, a, b, transform);
      ctx.restore();
    });
  };
}
