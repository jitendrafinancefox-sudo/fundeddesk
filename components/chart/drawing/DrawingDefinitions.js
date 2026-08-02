'use client';

// Single source of truth for per-tool drawing behavior: anchor count, label,
// canvas rendering and screen-space hit testing. The generic line path
// (segment between anchors) is the default for every type; specific tools
// override render/hitTest as needed. Renderers receive the raw anchor pixels
// so they stay viewport-agnostic.

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const fmtRatio = (ratio) => ratio.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
const fmtPrice = (price) => price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const segment = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };

export const DRAWING_DEFINITIONS = {
  trend: { label: 'Trend Line', anchorCount: 2, render: segment },
  hline: {
    label: 'Horizontal Line',
    anchorCount: 1,
    render: (ctx, a) => { ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && Math.abs(point.y - a.y) <= threshold; },
  },
  vline: {
    label: 'Vertical Line',
    anchorCount: 1,
    render: (ctx, a) => { ctx.beginPath(); ctx.moveTo(a.x, 0); ctx.lineTo(a.x, ctx.canvas.height); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && Math.abs(point.x - a.x) <= threshold; },
  },
  horizontalRay: {
    label: 'Horizontal Ray',
    anchorCount: 1,
    render: (ctx, a) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && point.x >= a.x - 2 && Math.abs(point.y - a.y) <= threshold; },
  },
  infoLine: {
    label: 'Info Line',
    anchorCount: 1,
    render: (ctx, a, b, drawing) => {
      ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke();
      const price = drawing.anchorPoints[0]?.price ?? 0;
      const text = `${(drawing.symbol || 'INFO').toUpperCase()}  ${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ctx.font = '600 9.5px Inter, sans-serif';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const width = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(12,18,28,.92)';
      ctx.fillRect(4, a.y - 9, width, 17);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(text, 10, a.y + 0.5);
    },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && Math.abs(point.y - a.y) <= threshold; },
  },
  rect: {
    label: 'Rectangle',
    anchorCount: 2,
    render: (ctx, a, b) => ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y),
    hitTest: (drawing, point, transform, threshold) => {
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (points.length < 2) return false;
      const xs = [points[0].x, points[1].x].sort((p, q) => p - q);
      const ys = [points[0].y, points[1].y].sort((p, q) => p - q);
      return point.x >= xs[0] - threshold && point.x <= xs[1] + threshold && point.y >= ys[0] - threshold && point.y <= ys[1] + threshold;
    },
  },
  ellipse: {
    label: 'Ellipse',
    anchorCount: 2,
    render: (ctx, a, b) => {
      const ex = Math.min(a.x, b.x); const ey = Math.min(a.y, b.y);
      const ew = Math.abs(b.x - a.x); const eh = Math.abs(b.y - a.y);
      ctx.beginPath(); ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2); ctx.stroke();
    },
    hitTest: (drawing, point, transform, threshold) => {
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (points.length < 2) return false;
      const a = points[0]; const b = points[1];
      const dx = (point.x - (a.x + b.x) / 2) / (Math.abs(b.x - a.x) / 2 + threshold);
      const dy = (point.y - (a.y + b.y) / 2) / (Math.abs(b.y - a.y) / 2 + threshold);
      return dx * dx + dy * dy <= 1;
    },
  },
  ray: {
    label: 'Ray',
    anchorCount: 2,
    render: (ctx, a, b) => { const t = 10000; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); ctx.stroke(); },
  },
  extended: {
    label: 'Extended Line',
    anchorCount: 2,
    render: (ctx, a, b) => { const t = 10000; ctx.beginPath(); ctx.moveTo(a.x - (b.x - a.x) * t, a.y - (b.y - a.y) * t); ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); ctx.stroke(); },
  },
  text: {
    label: 'Text Note',
    anchorCount: 1,
    render: (ctx, a, drawing) => ctx.fillText(drawing.text || 'Note', a.x, a.y),
  },
  arrow: {
    label: 'Arrow',
    anchorCount: 2,
    render: (ctx, a, b) => {
      segment(ctx, a, b);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - 10 * Math.cos(angle - 0.45), b.y - 10 * Math.sin(angle - 0.45));
      ctx.lineTo(b.x - 10 * Math.cos(angle + 0.45), b.y - 10 * Math.sin(angle + 0.45));
      ctx.closePath(); ctx.fill();
    },
  },
  arrowMarkUp: {
    label: 'Arrow Mark Up',
    anchorCount: 1,
    render: (ctx, a) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 8);
      ctx.lineTo(a.x - 5.5, a.y + 4);
      ctx.lineTo(a.x + 5.5, a.y + 4);
      ctx.closePath(); ctx.fill();
    },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && Math.hypot(point.x - a.x, point.y - a.y) <= threshold + 3; },
  },
  arrowMarkDown: {
    label: 'Arrow Mark Down',
    anchorCount: 1,
    render: (ctx, a) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 8);
      ctx.lineTo(a.x - 5.5, a.y - 4);
      ctx.lineTo(a.x + 5.5, a.y - 4);
      ctx.closePath(); ctx.fill();
    },
    hitTest: (drawing, point, transform, threshold) => { const a = transform.anchorToPixel(drawing.anchorPoints[0]); return Boolean(a) && Math.hypot(point.x - a.x, point.y - a.y) <= threshold + 3; },
  },
  measure: {
    label: 'Measure',
    anchorCount: 2,
    render: (ctx, a, b, drawing, transform) => {
      segment(ctx, a, b);
      const p1 = drawing.anchorPoints[0]?.price ?? 0;
      const p2 = drawing.anchorPoints[1]?.price ?? p1;
      const diff = Math.abs(p2 - p1);
      const pct = p1 ? ((p2 - p1) / p1) * 100 : null;
      const text = `${pct == null ? '—' : (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}  ${fmtPrice(diff)}`;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const textWidth = ctx.measureText(text).width;
      const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
      ctx.fillStyle = 'rgba(12,18,28,.85)';
      ctx.fillRect(mx - textWidth / 2 - 5, my - 8, textWidth + 10, 16);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(text, mx, my);
    },
  },
  fib: {
    label: 'Fib Retracement',
    anchorCount: 2,
    render: (ctx, a, b, drawing, transform) => {
      const p1 = drawing.anchorPoints[0]?.price ?? 0;
      const p2 = drawing.anchorPoints[1]?.price ?? p1;
      const x1 = Math.min(a.x, b.x); const x2 = Math.max(a.x, b.x);
      ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'middle';
      FIB_RATIOS.forEach((ratio, index) => {
        const price = p1 + (p2 - p1) * ratio;
        const y = transform.priceToPixel(price);
        ctx.globalAlpha = 0.5 + 0.5 * (index / (FIB_RATIOS.length - 1));
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        ctx.fillText(`${fmtRatio(ratio)}  ${fmtPrice(price)}`, x2 + 4, y - 1);
      });
    },
  },
  brush: { label: 'Brush', anchorCount: 2 },
  parallelChannel: { label: 'Parallel Channel', anchorCount: 2 },
  pitchfork: { label: 'Pitchfork', anchorCount: 2 },
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp01(((point.x - a.x) * dx + (point.y - a.y) * dy) / length) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export const anchorCountFor = (drawingType) => DRAWING_DEFINITIONS[drawingType]?.anchorCount ?? 2;
export const drawingLabelFor = (drawingType) => DRAWING_DEFINITIONS[drawingType]?.label || drawingType;
// Convention: every per-tool render receives (ctx, a, b, drawing, transform)
// where a/b are the first two anchor points projected to screen pixels.
export const renderDrawing = (ctx, drawing, a, b, transform) => DRAWING_DEFINITIONS[drawing.drawingType]?.render?.(ctx, a, b, drawing, transform) ?? segment(ctx, a, b);
export const hitTestDrawing = (drawing, point, transform, threshold = 7) => {
  const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
  if (!points.length) return false;
  const def = DRAWING_DEFINITIONS[drawing.drawingType];
  if (def?.hitTest) return def.hitTest(drawing, point, transform, threshold);
  const [a, b = a] = points;
  return distanceToSegment(point, a, b) <= threshold;
};
