'use client';

// FibLabelRenderer — Fibonacci level labels.
//
// Placement: Left / Right / Centered / Auto. Auto mirrors TradingView's
// behavior: labels sit at the right end of the level line and flip to the
// left when the text would overflow the canvas (or when the line does not
// extend to the right edge). Labels are recomputed every frame from the
// current geometry and transform, so they track zoom / pan / anchor edits
// automatically (dynamic updates).
//
// Format: Percentage ("0.618 (61.8%)"), Price, or Both — with a per-level
// custom label taking precedence. Styling (font size, family, background
// chip, text color) comes from drawing.fib.label.

import { fibFormatPrice } from './FibLevelManager';

const fmtTime = (time) => new Date(time * 1000).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

export function fibLabelConfig(drawing) {
  const label = drawing.fib?.label || {};
  return {
    format: ['percentage', 'price', 'both'].includes(label.format) ? label.format : 'both',
    position: ['left', 'right', 'center', 'auto'].includes(label.position) ? label.position : 'auto',
    fontSize: Math.max(8, Math.min(18, Number(label.fontSize) || 10)),
    font: typeof label.font === 'string' && label.font ? label.font : 'Inter, sans-serif',
    bg: label.bg !== false,
    textColor: typeof label.textColor === 'string' && label.textColor ? label.textColor : null,
  };
}

export function fibLabelText(level, price, config) {
  const ratio = level.label || `${Number(level.value).toFixed(3)}%`;
  if (config.format === 'percentage') return ratio;
  if (config.format === 'price') return fibFormatPrice(price);
  return `${ratio}  ${fibFormatPrice(price)}`;
}

// Resolve the anchor point + text alignment for a level label.
export function resolveLabelPosition(level, geometry, config, bounds) {
  const type = geometry.type;
  const width = bounds?.width ?? 100000;
  const height = bounds?.height ?? 100000;
  if (type === 'fibTimeZone') return { x: level.x, y: Math.max(12, height - 6), align: 'center', baseline: 'alphabetic', time: level.time };
  if (type === 'fibFan') return { x: Math.min(level.b.x, width - 4), y: level.b.y, align: 'right', baseline: 'middle' };
  if (type === 'fibChannel' || type === 'fibSpiral') return null; // handled per line/arc below
  // Horizontal level line labels
  const x1 = level.x1 ?? 0;
  const x2 = level.x2 ?? width;
  const position = config.position;
  if (position === 'left') return { x: x1 + 4, y: level.y, align: 'left', baseline: 'middle' };
  if (position === 'center') return { x: (x1 + x2) / 2, y: level.y, align: 'center', baseline: 'middle' };
  if (position === 'right' || x2 >= width - 4) return { x: x2 - 4, y: level.y, align: 'right', baseline: 'middle' };
  return { x: x1 + 4, y: level.y, align: 'left', baseline: 'middle' };
}

// Draw one label chip. Returns the label's pixel width (so callers can pack
// labels or let auto placement measure before committing to a side).
export function drawFibLabel(ctx, text, position, config, color) {
  const font = `${config.fontSize}px ${config.font}`;
  ctx.font = `500 ${font}`;
  ctx.textBaseline = position.baseline || 'middle';
  ctx.textAlign = position.align || 'left';
  const textWidth = ctx.measureText(text).width;
  let x = position.x;
  if (config.bg) {
    const pad = 4; const h = config.fontSize + 6;
    let boxX = x;
    if (position.align === 'right') boxX = x - textWidth - pad;
    else if (position.align === 'center') boxX = x - textWidth / 2 - pad;
    ctx.fillStyle = 'rgba(10, 14, 22, .78)';
    ctx.fillRect(boxX, position.y - h / 2, textWidth + pad * 2, h);
    x = boxX + pad;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, position.y);
  return textWidth;
}
