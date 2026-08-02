'use client';

// Single source of truth for per-tool drawing behavior: anchor count, label,
// canvas rendering and screen-space hit testing. The generic line path
// (segment between anchors) is the default for every type; specific tools
// override render/hitTest as needed. Renderers receive the raw anchor pixels
// so they stay viewport-agnostic.
//
// Shape tools (`shape: true`) are stored as corner anchors in data
// coordinates (4 for box shapes, 3 for triangle) and rendered as polygons,
// so rotation is baked into the anchors and every edit is a screen-space
// transform converted back through pixelToAnchor.

import {
  polygonCorners, polygonBounds, polygonCenter, pointInPolygon, distanceToPolygon,
} from './ShapeGeometry';
import { channelGeometry, channelHitTest, extendLine, extendFlat } from './ChannelGeometry';
import { isFibType } from './FibGeometry';
import { renderFib } from './FibRenderer';
import { fibHitTest } from './FibHitTester';
export { isChannelType } from './ChannelGeometry';
export { isFibType };

const fmtPrice = (price) => price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const segment = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
const shapePoints = (drawing, transform) => drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
const polygon = (ctx, points, close = true) => { ctx.beginPath(); points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (close) ctx.closePath(); };

export const ZONE_TYPES = ['supplyZone', 'demandZone', 'smcZone', 'premiumDiscountZone'];
export const isZoneType = (drawingType) => ZONE_TYPES.includes(drawingType);
export const zoneColorFor = (drawingType) => ({
  supplyZone: '#ef4444', demandZone: '#22c55e', smcZone: '#4d7cfe', premiumDiscountZone: '#eab308',
}[drawingType] || '#4d7cfe');

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
    anchorCount: 2, shape: true, cornerCount: 4, rotatable: true,
    render: (ctx, a, b, drawing, transform) => { polygon(ctx, polygonCorners(shapePoints(drawing, transform))); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const pts = polygonCorners(shapePoints(drawing, transform)); return Boolean(pts.length >= 3) && (pointInPolygon(point, pts) || distanceToPolygon(point, pts) <= threshold); },
  },
  rotatedRect: {
    label: 'Rotated Rectangle',
    anchorCount: 2, shape: true, cornerCount: 4, rotatable: true,
    render: (ctx, a, b, drawing, transform) => { polygon(ctx, polygonCorners(shapePoints(drawing, transform))); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const pts = polygonCorners(shapePoints(drawing, transform)); return Boolean(pts.length >= 3) && (pointInPolygon(point, pts) || distanceToPolygon(point, pts) <= threshold); },
  },
  circle: {
    label: 'Circle',
    anchorCount: 2, shape: true, cornerCount: 4, rotatable: false,
    render: (ctx, a, b, drawing, transform) => {
      const pts = polygonCorners(shapePoints(drawing, transform));
      const box = polygonBounds(pts);
      const side = Math.max(box.width, box.height);
      const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, side / 2, side / 2, 0, 0, Math.PI * 2); ctx.stroke();
    },
    hitTest: (drawing, point, transform, threshold) => {
      const pts = polygonCorners(shapePoints(drawing, transform));
      const box = polygonBounds(pts);
      const side = Math.max(box.width, box.height);
      const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
      const dx = (point.x - cx) / (side / 2 + threshold); const dy = (point.y - cy) / (side / 2 + threshold);
      return dx * dx + dy * dy <= 1;
    },
  },
  ellipse: {
    label: 'Ellipse',
    anchorCount: 2, shape: true, cornerCount: 4, rotatable: false,
    render: (ctx, a, b, drawing, transform) => {
      const box = polygonBounds(polygonCorners(shapePoints(drawing, transform)));
      ctx.beginPath(); ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2); ctx.stroke();
    },
    hitTest: (drawing, point, transform, threshold) => {
      const box = polygonBounds(polygonCorners(shapePoints(drawing, transform)));
      const rx = box.width / 2 + threshold; const ry = box.height / 2 + threshold;
      const dx = (point.x - (box.x + box.width / 2)) / rx; const dy = (point.y - (box.y + box.height / 2)) / ry;
      return dx * dx + dy * dy <= 1;
    },
  },
  triangle: {
    label: 'Triangle',
    anchorCount: 2, shape: true, cornerCount: 3, rotatable: true,
    render: (ctx, a, b, drawing, transform) => { polygon(ctx, polygonCorners(shapePoints(drawing, transform))); ctx.stroke(); },
    hitTest: (drawing, point, transform, threshold) => { const pts = polygonCorners(shapePoints(drawing, transform)); return Boolean(pts.length >= 3) && (pointInPolygon(point, pts) || distanceToPolygon(point, pts) <= threshold); },
  },
  supplyZone: {
    label: 'Supply Zone',
    anchorCount: 2, shape: true, cornerCount: 4, zone: true,
    render: (ctx, a, b, drawing, transform) => { renderZone(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => zoneHit(drawing, point, transform, threshold),
  },
  demandZone: {
    label: 'Demand Zone',
    anchorCount: 2, shape: true, cornerCount: 4, zone: true,
    render: (ctx, a, b, drawing, transform) => { renderZone(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => zoneHit(drawing, point, transform, threshold),
  },
  smcZone: {
    label: 'SMC Zone',
    anchorCount: 2, shape: true, cornerCount: 4, zone: true,
    render: (ctx, a, b, drawing, transform) => { renderZone(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => zoneHit(drawing, point, transform, threshold),
  },
  premiumDiscountZone: {
    label: 'Premium / Discount',
    anchorCount: 2, shape: true, cornerCount: 4, zone: true,
    render: (ctx, a, b, drawing, transform) => { renderZone(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => zoneHit(drawing, point, transform, threshold),
  },
  parallelChannel: {
    label: 'Parallel Channel',
    anchorCount: 3, channel: true, rotatable: true,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
  },
  flatTopChannel: {
    label: 'Flat Top Channel',
    anchorCount: 3, channel: true, rotatable: false,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
  },
  flatBottomChannel: {
    label: 'Flat Bottom Channel',
    anchorCount: 3, channel: true, rotatable: false,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
  },
  disjointChannel: {
    label: 'Disjoint Channel',
    anchorCount: 4, channel: true, rotatable: true,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
  },
  regressionChannel: {
    label: 'Regression Channel',
    anchorCount: 3, channel: true, rotatable: false,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
  },
  linearRegressionChannel: {
    label: 'Linear Regression Channel',
    anchorCount: 3, channel: true, rotatable: false,
    render: (ctx, a, b, drawing, transform) => { renderChannel(ctx, drawing, transform); },
    hitTest: (drawing, point, transform, threshold) => channelHitTest(drawing, point, transform, threshold),
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
  fib: { label: 'Fib Retracement', anchorCount: 2, fib: true, rotatable: false, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibExtension: { label: 'Fib Extension', anchorCount: 2, fib: true, rotatable: false, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibProjection: { label: 'Fib Projection', anchorCount: 3, fib: true, rotatable: false, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibFan: { label: 'Fib Fan', anchorCount: 2, fib: true, rotatable: false, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibChannel: { label: 'Fib Channel', anchorCount: 3, fib: true, rotatable: true, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibSpiral: { label: 'Fib Spiral', anchorCount: 2, fib: true, rotatable: true, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
  fibTimeZone: { label: 'Fib Time Zone', anchorCount: 2, fib: true, rotatable: false, render: (ctx, a, b, drawing, transform) => renderFib(ctx, drawing, transform), hitTest: (drawing, point, transform, threshold) => fibHitTest(drawing, point, transform, threshold) },
};

// Zone band rendering: translucent fill + top/bottom borders + labels.
// Extend flags stretch the band to the canvas edges (default on).
function renderZone(ctx, drawing, transform) {
  const pts = polygonCorners(shapePoints(drawing, transform));
  if (pts.length < 2) return;
  const box = polygonBounds(pts);
  const color = drawing.style?.color || zoneColorFor(drawing.drawingType);
  const opacity = drawing.style?.opacity ?? 0.22;
  const extendLeft = drawing.style?.extendLeft !== false;
  const extendRight = drawing.style?.extendRight !== false;
  const left = extendLeft ? 0 : box.x;
  const right = extendRight ? ctx.canvas.width : box.x + box.width;
  const top = box.y; const bottom = box.y + box.height;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = drawing.style?.lineWidth || 1.5;
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke();
  if (drawing.style?.showLabel !== false) {
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const name = drawingLabelFor(drawing.drawingType);
    ctx.fillText(name, left + 6, top + 9);
  }
  if (drawing.style?.showPrice !== false) {
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const topPrice = drawing.anchorPoints[0]?.price ?? 0;
    const bottomPrice = drawing.anchorPoints[1]?.price ?? topPrice;
    const hi = Math.max(topPrice, bottomPrice); const lo = Math.min(topPrice, bottomPrice);
    ctx.fillStyle = color;
    ctx.fillText(fmtPrice(hi), left + 6, top - 4);
    ctx.fillText(fmtPrice(lo), left + 6, bottom + 11);
  }
  if (drawing.style?.showTime !== false && !extendLeft && !extendRight) {
    const t1 = drawing.anchorPoints[0]?.time ?? 0;
    const t2 = drawing.anchorPoints[1]?.time ?? t1;
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    const label = `${new Date(Math.min(t1, t2) * 1000).toLocaleDateString('en-IN')} – ${new Date(Math.max(t1, t2) * 1000).toLocaleDateString('en-IN')}`;
    ctx.fillStyle = 'rgba(12,18,28,.85)';
    const width = ctx.measureText(label).width;
    ctx.fillRect(right - width - 12, bottom + 2, width + 10, 16);
    ctx.fillStyle = color;
    ctx.fillText(label, right - 7, bottom + 13);
  }
}

function zoneHit(drawing, point, transform, threshold) {
  const pts = polygonCorners(shapePoints(drawing, transform));
  if (pts.length < 2) return false;
  const box = polygonBounds(pts);
  const extendLeft = drawing.style?.extendLeft !== false;
  const extendRight = drawing.style?.extendRight !== false;
  const insideX = extendLeft && extendRight ? true : (extendLeft ? point.x >= -threshold : extendRight ? point.x <= box.x + box.width + threshold : point.x >= box.x - threshold && point.x <= box.x + box.width + threshold);
  return insideX && point.y >= box.y - threshold && point.y <= box.y + box.height + threshold;
}

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// Channel painter: fills the band, strokes the channel lines (with the
// center line thinner and fainter), honors extend flags, dash style,
// opacity and arrow style on the base line. Shared by the ChannelRenderer
// thread and the preview path via renderDrawing.
function renderChannel(ctx, drawing, transform) {
  const geo = channelGeometry(drawing, transform);
  if (!geo) return;
  const style = drawing.style || {};
  const color = style.color || '#4d7cfe';
  const lineWidth = style.lineWidth || 1.5;
  const dash = style.dash ? [6, 4] : [];
  const extendLeft = style.extendLeft !== false;
  const extendRight = style.extendRight !== false;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  const strokeLine = (a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
  const band = (lineA, lineB) => {
    if (style.fill === false) return;
    ctx.globalAlpha = style.opacity ?? 0.12;
    ctx.beginPath();
    ctx.moveTo(lineA.a.x, lineA.a.y); ctx.lineTo(lineA.b.x, lineA.b.y);
    ctx.lineTo(lineB.b.x, lineB.b.y); ctx.lineTo(lineB.a.x, lineB.a.y);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  };
  const arrow = (a, b) => {
    if (!style.arrow) return;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - 10 * Math.cos(angle - 0.45), b.y - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(b.x - 10 * Math.cos(angle + 0.45), b.y - 10 * Math.sin(angle + 0.45));
    ctx.closePath(); ctx.fill();
  };
  if (geo.type === 'parallelChannel' || geo.type === 'regressionChannel') {
    if (!geo.offA) { ctx.setLineDash(dash); ctx.lineWidth = lineWidth; strokeLine(geo.baseA, geo.baseB); arrow(geo.baseA, geo.baseB); ctx.restore(); return; }
    const base = extendLine(geo.baseA, geo.baseB, extendLeft, extendRight);
    const off = extendLine(geo.offA, geo.offB, extendLeft, extendRight);
    band(base, off);
    ctx.setLineDash(dash); ctx.lineWidth = lineWidth;
    strokeLine(base.a, base.b); strokeLine(off.a, off.b); arrow(base.a, base.b);
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    const center = extendLine({ x: geo.center.x - (geo.baseB.x - geo.baseA.x) / 2, y: geo.center.y - (geo.baseB.y - geo.baseA.y) / 2 }, { x: geo.center.x + (geo.baseB.x - geo.baseA.x) / 2, y: geo.center.y + (geo.baseB.y - geo.baseA.y) / 2 }, extendLeft, extendRight);
    strokeLine(center.a, center.b);
    ctx.restore();
    return;
  }
  if (geo.type === 'linearRegressionChannel') {
    if (!geo.upperA || !geo.lowerA) { ctx.setLineDash(dash); ctx.lineWidth = lineWidth; strokeLine(geo.baseA, geo.baseB); arrow(geo.baseA, geo.baseB); ctx.restore(); return; }
    const upper = extendLine(geo.upperA, geo.upperB, extendLeft, extendRight);
    const lower = extendLine(geo.lowerA, geo.lowerB, extendLeft, extendRight);
    const base = extendLine(geo.baseA, geo.baseB, extendLeft, extendRight);
    band(upper, lower);
    ctx.setLineDash(dash); ctx.lineWidth = lineWidth;
    strokeLine(upper.a, upper.b); strokeLine(lower.a, lower.b);
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    strokeLine(base.a, base.b);
    ctx.restore();
    return;
  }
  if (geo.type === 'flatTopChannel' || geo.type === 'flatBottomChannel') {
    const xs = [geo.flatPoint.x, geo.slopeA.x, geo.slopeB.x];
    const flat = extendFlat(geo.flatPoint.y, xs, extendLeft, extendRight);
    const slope = extendLine(geo.slopeA, geo.slopeB, extendLeft, extendRight);
    band(flat, slope);
    ctx.setLineDash(dash); ctx.lineWidth = lineWidth;
    strokeLine(flat.a, flat.b); strokeLine(slope.a, slope.b);
    ctx.restore();
    return;
  }
  if (geo.type === 'disjointChannel') {
    // Partial (2-anchor preview) geometry carries the line as baseA/baseB.
    if (!geo.line1A || !geo.line2A) {
      const sA = geo.line1A || geo.baseA; const sB = geo.line1B || geo.baseB;
      ctx.setLineDash(dash); ctx.lineWidth = lineWidth; strokeLine(sA, sB); arrow(sA, sB); ctx.restore(); return;
    }
    const l1 = extendLine(geo.line1A, geo.line1B, extendLeft, extendRight);
    const l2 = extendLine(geo.line2A, geo.line2B, extendLeft, extendRight);
    band(l1, l2);
    ctx.setLineDash(dash); ctx.lineWidth = lineWidth;
    strokeLine(l1.a, l1.b); strokeLine(l2.a, l2.b);
    ctx.restore();
  }
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? clamp01(((point.x - a.x) * dx + (point.y - a.y) * dy) / length) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export const anchorCountFor = (drawingType) => DRAWING_DEFINITIONS[drawingType]?.anchorCount ?? 2;export const drawingLabelFor = (drawingType) => DRAWING_DEFINITIONS[drawingType]?.label || drawingType;
export const isShapeType = (drawingType) => Boolean(DRAWING_DEFINITIONS[drawingType]?.shape);
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

// Promote a 2-anchor drag diagonal to full corner anchors (data space), so
// every shape is edited as its real corners. Idempotent for already-normalized
// drawings.
export function normalizeShapeAnchors(drawing) {
  const def = DRAWING_DEFINITIONS[drawing.drawingType];
  if (!def?.shape) return drawing.anchorPoints;
  if (drawing.anchorPoints.length === (def.cornerCount || 4)) return drawing.anchorPoints;
  const [a, b] = drawing.anchorPoints;
  const t1 = Math.min(a.time, b.time); const t2 = Math.max(a.time, b.time);
  const p1 = Math.max(a.price, b.price); const p2 = Math.min(a.price, b.price);
  if (def.cornerCount === 3) return [{ time: t1, price: p1 }, { time: t2, price: p1 }, { time: (t1 + t2) / 2, price: p2 }];
  return [{ time: t1, price: p1 }, { time: t2, price: p1 }, { time: t2, price: p2 }, { time: t1, price: p2 }];
}
