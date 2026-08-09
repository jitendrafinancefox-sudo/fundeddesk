'use client';
import { renderDrawing } from '@/components/chart/drawing/DrawingDefinitions';
import { themeTokens, alpha } from '@/components/chart/engine/ThemeManager';

// Canvas painter for the drawing-bodies layer. Reuses the single legacy
// render dispatch (renderDrawing) which covers all 60+ drawing types; this
// module owns only the canvas setup, style tinting (selected/hover), z-order
// (registry order, last = topmost) and dirty-rect partial repaints.
//
// Canvas coordinate system: CSS pixels (the context transform already
// accounts for devicePixelRatio).

function pointsOf(drawing, transform) {
  if (!drawing?.anchorPoints?.length) return [];
  return drawing.anchorPoints.map((anchor) => {
    const p = transform.anchorToPixel(anchor);
    return p ? { x: p.x, y: p.y } : null;
  }).filter(Boolean);
}

export function createOverlayRenderer({ canvas, getTransform, getDrawings, getSelection, getHover, isHidden }) {
  const ctx = canvas?.getContext('2d') || null;
  const theme = themeTokens();
  const accent = theme.accent || '#2962ff';
  const debug = { lastRender: null };

  const applyStyle = (g, drawing, isSelected, isHovered) => {
    g.save();
    const base = drawing.style?.color || theme.gold;
    if (isSelected) { g.strokeStyle = accent; g.fillStyle = accent; }
    else if (isHovered) { g.strokeStyle = alpha(accent, 0.6); g.fillStyle = alpha(accent, 0.6); }
    else { g.strokeStyle = base; g.fillStyle = base; }
    g.lineWidth = (drawing.style?.lineWidth || 1.5) + (isHovered ? 1 : 0);
    if (drawing.style?.dash) g.setLineDash([6, 4]);
  };

  const paintOne = (drawing, transform, { isSelected = false, isHovered = false, preview = false, targetCtx = null } = {}) => {
    const g = targetCtx || ctx;
    if (!g) return;
    const points = pointsOf(drawing, transform);
    if (!points.length) return;
    const [a, b = a] = points;
    g.save();
    if (preview) {
      g.strokeStyle = accent; g.fillStyle = accent;
      g.lineWidth = 1.5;
      g.setLineDash([4, 3]);
    } else {
      applyStyle(g, drawing, isSelected, isHovered);
    }
    renderDrawing(g, drawing, a, b, transform);
    g.restore();
  };

  const render = (rect) => {
    if (!ctx) return;
    const transform = getTransform();
    const drawings = getDrawings();
    const selectedIds = new Set(getSelection?.()?.ids() || []);
    const hover = getHover?.() || null;
    ctx.save();
    if (rect) {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    let painted = 0;
    for (const drawing of drawings) {
      if (isHidden?.(drawing.id) || drawing.hidden) continue;
      const isSelected = selectedIds.has(drawing.id);
      const isHovered = hover && hover.id === drawing.id && !isSelected;
      paintOne(drawing, transform, { isSelected, isHovered });
      painted += 1;
    }
    debug.lastRender = { count: drawings.length, painted, firstColor: drawings[0]?.style?.color || null, firstType: drawings[0]?.drawingType || null };
    ctx.restore();
  };

  const paintPending = (drawing, targetCtx = null) => {
    const g = targetCtx || ctx;
    if (!g) return;
    g.save();
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (drawing) paintOne(drawing, getTransform(), { preview: true, targetCtx: g });
    g.restore();
  };

  const clear = () => { ctx?.clearRect(0, 0, canvas.width, canvas.height); };

  const testPaint = (drawing) => {
    if (!ctx || !drawing) return -1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.save();
    paintOne(drawing, getTransform(), { isSelected: false, isHovered: false });
    ctx.restore();
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n += 1;
    return n;
  };

  return { render, paintPending, clear, pointsOf, testPaint, debug };
}
