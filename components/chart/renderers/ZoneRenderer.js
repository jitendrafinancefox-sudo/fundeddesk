'use client';
import { renderDrawing, zoneColorFor } from '../drawing/DrawingDefinitions';
import { themeTokens } from '../engine/ThemeManager';

// Dedicated pass for zone drawings (supply/demand/SMC/premium-discount).
// Zones keep their own colors regardless of selection — selection is
// communicated by handles, not by repainting the band. Rendered below the
// line/shape thread so drawings stack on top of zones.
export function ZoneRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const theme = themeTokens();
  return (ctx) => {
    drawings.forEach((drawing) => {
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (!points.length) return;
      const [a, b = a] = points;
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      ctx.save();
      ctx.strokeStyle = zoneColorFor(drawing.drawingType);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = (drawing.style?.lineWidth || 1.5) + (isHovered ? 1 : 0);
      renderDrawing(ctx, drawing, a, b, transform);
      if (isSelected) {
        ctx.strokeStyle = theme.alpha(theme.text, 0.85);
        ctx.lineWidth = 1;
        const pts = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
        const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
        const left = Math.min(...xs); const top = Math.min(...ys);
        const right = Math.max(...xs); const bottom = Math.max(...ys);
        ctx.strokeRect(left - 2, top - 2, right - left + 4, bottom - top + 4);
      }
      ctx.restore();
    });
  };
}
