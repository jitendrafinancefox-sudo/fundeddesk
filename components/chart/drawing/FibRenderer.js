'use client';

// FibRenderer — canvas painter for all seven Fibonacci tools.
//
// Shared styling across every tool: per-level line colors (custom level
// colors win; otherwise the hue ramp), line width / dash / opacity from the
// drawing style, background fills between level bands (solid or gradient),
// arrow heads at line ends (style.arrow), and level labels through
// FibLabelRenderer. Horizontal tools paint alternating translucent bands
// between consecutive enabled levels (TradingView's look); the channel paints
// its band from base to offset; fans, spirals and time zones paint their
// geometry with the same stroke settings.

import { fibGeometry } from './FibGeometry';
import { fibLabelConfig, fibLabelText, resolveLabelPosition, drawFibLabel } from './FibLabelRenderer';
import { fibFormatPrice } from './FibLevelManager';
import { themeTokens } from '../engine/ThemeManager';

const LEVEL_ALPHA = 0.045;
const theme = themeTokens();
const DASH = [6, 4];
const HORIZONTAL_TYPES = ['fib', 'fibExtension', 'fibProjection'];

function strokeStyle(ctx, style) {
  ctx.lineWidth = style.lineWidth || 1.25;
  ctx.setLineDash(style.dash ? DASH : []);
  ctx.lineCap = 'round';
}

function drawLevelLine(ctx, a, b, color, arrowEnd) {
  ctx.strokeStyle = color;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  if (arrowEnd) drawArrow(ctx, a, b, color);
}

function drawArrow(ctx, a, b, color) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - 10 * Math.cos(angle - 0.42), b.y - 10 * Math.sin(angle - 0.42));
  ctx.lineTo(b.x - 10 * Math.cos(angle + 0.42), b.y - 10 * Math.sin(angle + 0.42));
  ctx.closePath(); ctx.fill();
}

// Alternating translucent bands between consecutive level lines, using each
// band's top-level color. Solid mode fills one rect over the whole span with
// the drawing color; gradient mode interpolates the level colors vertically.
function paintBands(ctx, geometry, style, horizontal) {
  if (style.fill === false || !geometry.levelLines?.length) return;
  const levels = geometry.levelLines;
  const width = horizontal ? (ctx.canvas.width || 20000) : 40000;
  const left = horizontal ? 0 : -20000;
  if (style.fillMode === 'gradient') {
    const top = levels[0].y; const bottom = levels[levels.length - 1].y;
    if (Math.abs(bottom - top) < 1) return;
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    levels.forEach((line, index) => gradient.addColorStop(index / Math.max(1, levels.length - 1), line.color || style.color || theme.accent));
    ctx.fillStyle = gradient;
    ctx.globalAlpha = style.opacity ?? 0.16;
    ctx.fillRect(left, Math.min(top, bottom), width, Math.abs(bottom - top));
    ctx.globalAlpha = 1;
    return;
  }
  if (style.fillMode === 'solid') {
    const ys = levels.map((line) => line.y);
    const top = Math.min(...ys); const bottom = Math.max(...ys);
    if (Math.abs(bottom - top) < 1) return;
    ctx.fillStyle = style.color || theme.accent;
    ctx.globalAlpha = style.opacity ?? 0.12;
    ctx.fillRect(left, top, width, bottom - top);
    ctx.globalAlpha = 1;
    return;
  }
  const enabled = levels.filter((line) => line.enabled);
  for (let i = 0; i < enabled.length - 1; i += 1) {
    const top = enabled[i]; const bottom = enabled[i + 1];
    if (Math.abs(bottom.y - top.y) < 1) continue;
    ctx.fillStyle = (i % 2 === 0 ? top : bottom).color || style.color || theme.accent;
    ctx.globalAlpha = LEVEL_ALPHA;
    ctx.fillRect(left, Math.min(top.y, bottom.y), width, Math.abs(bottom.y - top.y));
    ctx.globalAlpha = 1;
  }
}

// Level price in market coordinates (for labels). Horizontal tools derive it
// from the anchor prices directly; the channel converts the line's pixel
// position back through the transform.
function priceAt(drawing, transform, geometry, line) {
  const anchors = drawing.anchorPoints;
  const p0 = anchors[0]?.price ?? 0;
  const p1 = anchors[1]?.price ?? p0;
  if (geometry.type === 'fib' || geometry.type === 'fibExtension') return p0 + (p1 - p0) * line.value;
  if (geometry.type === 'fibProjection') {
    const p2 = anchors[2]?.price ?? p0;
    return p2 + (p1 - p0) * line.value;
  }
  if (geometry.type === 'fibChannel') return transform.pixelToPrice(line.a.y);
  return null;
}

function paintLabels(ctx, drawing, transform, geometry, config, bounds) {
  const { type } = geometry;
  if (type === 'fibSpiral') return;
  const colorOf = (line) => line.color || drawing.style?.color || theme.accent;
  if (type === 'fibChannel') {
    if (!geometry.levelLines) return; // incomplete placement (1-2 anchors)
    geometry.levelLines.forEach((line) => {
      if (!line.enabled) return;
      const price = priceAt(drawing, transform, geometry, line);
      const text = fibLabelText(line, fibFormatPrice(price), config);
      drawFibLabel(ctx, text, { x: line.b.x - 4, y: line.b.y, align: 'right', baseline: 'middle' }, config, colorOf(line));
    });
    return;
  }
  if (type === 'fibTimeZone') {
    geometry.lines.forEach((line) => {
      if (!line.enabled) return;
      const position = resolveLabelPosition(line, geometry, config, bounds);
      const text = config.format === 'percentage' ? (line.label || `${line.value}%`) : `${line.label || line.value}%  ${new Date(line.time * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
      drawFibLabel(ctx, text, position, config, colorOf(line));
    });
    return;
  }
  if (type === 'fibFan') {
    geometry.rays.forEach((ray) => {
      if (!ray.enabled) return;
      const position = resolveLabelPosition(ray, geometry, config, bounds);
      const text = config.format === 'price' ? fibFormatPrice(priceAt(drawing, transform, geometry, ray)) : (ray.label || `${ray.value}%`);
      drawFibLabel(ctx, text, position, config, colorOf(ray));
    });
    return;
  }
  geometry.levelLines.forEach((line) => {
    if (!line.enabled) return;
    const price = priceAt(drawing, transform, geometry, line);
    const text = fibLabelText(line, fibFormatPrice(price), config);
    const position = resolveLabelPosition(line, geometry, config, bounds);
    drawFibLabel(ctx, text, position, config, colorOf(line));
  });
}

export function renderFib(ctx, drawing, transform) {
  const bounds = { width: ctx.canvas.width || 100000, height: ctx.canvas.height || 100000 };
  const geometry = fibGeometry(drawing, transform, bounds);
  if (!geometry) return;
  const style = drawing.style || {};
  const config = fibLabelConfig(drawing);
  const color = style.color || theme.accent;
  const arrow = Boolean(style.arrow);
  ctx.save();
  ctx.globalAlpha = style.opacity ?? 1;
  strokeStyle(ctx, style);

  const { type } = geometry;

  if (HORIZONTAL_TYPES.includes(type)) {
    paintBands(ctx, geometry, style, true);
    ctx.globalAlpha = style.opacity ?? 1;
    geometry.levelLines.forEach((line) => {
      if (!line.enabled) return;
      drawLevelLine(ctx, { x: line.x1, y: line.y }, { x: line.x2, y: line.y }, line.color || color, arrow);
    });
    // Light connector between the two anchor points
    ctx.globalAlpha = (style.opacity ?? 1) * 0.55;
    ctx.setLineDash([2, 3]);
    drawLevelLine(ctx, { x: geometry.base.x, y: geometry.base.y }, { x: geometry.base.x, y: geometry.base.y + geometry.step }, color);
    ctx.setLineDash(style.dash ? DASH : []);
    paintLabels(ctx, drawing, transform, geometry, config, bounds);
    ctx.restore();
    return;
  }

  if (type === 'fibFan') {
    ctx.globalAlpha = style.opacity ?? 1;
    geometry.rays.forEach((ray) => {
      if (!ray.enabled) return;
      drawLevelLine(ctx, ray.a, ray.b, ray.color || color, false);
    });
    paintLabels(ctx, drawing, transform, geometry, config, bounds);
    ctx.restore();
    return;
  }

  if (type === 'fibChannel') {
    paintBands(ctx, geometry, style, false);
    ctx.globalAlpha = style.opacity ?? 1;
    if (geometry.levelLines) {
      geometry.levelLines.forEach((line) => {
        if (!line.enabled) return;
        drawLevelLine(ctx, line.a, line.b, line.color || color, false);
      });
    }
    if (arrow && geometry.baseA && geometry.baseB) drawArrow(ctx, geometry.baseA, geometry.baseB, color);
    paintLabels(ctx, drawing, transform, geometry, config, bounds);
    ctx.restore();
    return;
  }

  if (type === 'fibSpiral') {
    ctx.globalAlpha = style.opacity ?? 1;
    geometry.arcs.forEach((arc) => {
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.arc(arc.center.x, arc.center.y, arc.radius, arc.start, arc.end, false); ctx.stroke();
    });
    ctx.restore();
    return;
  }

  if (type === 'fibTimeZone') {
    ctx.globalAlpha = style.opacity ?? 1;
    geometry.lines.forEach((line) => {
      if (!line.enabled) return;
      ctx.strokeStyle = line.color || color;
      ctx.beginPath(); ctx.moveTo(line.x, 0); ctx.lineTo(line.x, bounds.height); ctx.stroke();
    });
    paintLabels(ctx, drawing, transform, geometry, config, bounds);
    ctx.restore();
    return;
  }

  ctx.restore();
}
