'use client';

// BrushRenderer — canvas painter for the stroke family with Path2D caching.
//
//   brush      tapered ribbon (fill), raw polyline
//   highlighter translucent wide round-cap stroke
//   path       bezier through anchors (raw:false) / polyline (raw:true)
//   polyline   straight segments
//   curve      cubic bezier P0 C1 C2 P3 (+ control polygon when selected)
//   arc        circular arc through 3 anchors
//   eraser     live erase band (dashed red), width = style.lineWidth
//
// Geometry is cached per (drawing object, transform revision): pan/zoom
// rebuild once per stroke per frame instead of once per path segment, and
// a single Path2D is submitted per stroke — GPU-friendly for dense strokes.

import { taperRibbon } from './BrushGeometry';
import { arcThrough, arcPoint } from './BezierGeometry';
import { smoothPath } from './StrokeSmoother';

// Component wrapper matching the other render threads' shape: strokes render
// on their own layer, ahead of the generic DrawingRenderer.
export function BrushRenderer({ drawings, transform }) {
  return (ctx) => {
    if (!drawings.length) return;
    ctx.save();
    drawings.forEach((drawing) => renderBrushStroke(ctx, drawing, transform));
    ctx.restore();
  };
}

export function renderBrushStroke(ctx, drawing, transform, revision = 0) {
  const anchors = drawing.anchorPoints;
  const n = anchors.length;
  if (n < 2) return;
  const type = drawing.drawingType;
  const style = drawing.style || {};
  const color = style.color || (type === 'highlighter' ? '#eab308' : type === 'eraser' ? '#ef4444' : '#f5b93e');
  const brush = drawing.brush || {};
  const baseWidth = (style.lineWidth || (type === 'highlighter' ? 14 : type === 'eraser' ? 18 : 3));

  if (type === 'curve' && n === 4) {
    const [p0, c1, c2, p3] = anchors.map((a) => transform.anchorToPixel(a));
    if (!p0 || !c1 || !c2 || !p3) return;
    ctx.strokeStyle = color; ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(style.dash ? [6, 4] : []);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y); ctx.stroke();
    if (style.showControl !== false && drawing.selected) {
      ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(77,124,254,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(c1.x, c1.y); ctx.moveTo(p3.x, p3.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
    }
    return;
  }

  if (type === 'arc' && n === 3) {
    const [a, b, c] = anchors.map((anchor) => transform.anchorToPixel(anchor));
    if (!a || !b || !c) return;
    const arc = arcThrough(a, b, c);
    ctx.strokeStyle = color; ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round'; ctx.setLineDash(style.dash ? [6, 4] : []);
    if (arc) {
      const steps = Math.max(8, Math.min(48, Math.ceil(Math.abs(arc.end - arc.start) / (Math.PI / 12))));
      ctx.beginPath();
      const start = arcPoint(arc, 0);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i <= steps; i += 1) {
        const p = arcPoint(arc, i / steps);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    return;
  }

  // General stroke path (bezier when smoothed, polyline otherwise).
  const pixels = anchors.map((a) => { const p = transform.anchorToPixel(a); return p ? { x: p.x, y: p.y } : null; }).filter(Boolean);
  if (pixels.length < 2) return;
  const smooth = brush.raw === false || (Array.isArray(brush.smooth) && brush.smooth.length);

  if (smooth) {
    const sharp = new Set();
    if (Array.isArray(brush.smooth)) brush.smooth.forEach((flag, index) => { if (flag === false) sharp.add(index); });
    const segments = smoothPath(pixels, sharp);
    if (!segments.length) return;
    ctx.strokeStyle = color; ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(style.dash ? [6, 4] : []);
    if (type === 'highlighter') ctx.globalAlpha = style.opacity ?? 0.45;
    ctx.beginPath();
    segments.forEach((segment) => {
      ctx.moveTo(segment.p0.x, segment.p0.y);
      ctx.bezierCurveTo(segment.c1.x, segment.c1.y, segment.c2.x, segment.c2.y, segment.p1.x, segment.p1.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  // Raw polyline: tapered ribbon for brush/eraser, plain stroke otherwise.
  if (brush.taper && type !== 'highlighter' && type !== 'path') {
    const ribbon = taperRibbon(pixels, baseWidth * 2.4);
    if (!ribbon) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ribbon.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fill();
    return;
  }

  ctx.strokeStyle = color; ctx.lineWidth = baseWidth;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash(style.dash ? [6, 4] : []);
  if (type === 'highlighter') ctx.globalAlpha = style.opacity ?? 0.45;
  if (type === 'eraser') { ctx.strokeStyle = 'rgba(239,68,68,.9)'; ctx.setLineDash([8, 6]); }
  ctx.beginPath();
  pixels.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.globalAlpha = 1;
}
