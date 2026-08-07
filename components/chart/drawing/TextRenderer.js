'use client';
import { themeTokens } from '../engine/ThemeManager';
import { textLayout } from './TextLayoutEngine';
import { fontString } from './FontManager';
import { estimateBox, textAnchorPoint, textColorFor } from './TextGeometry';

// Text-tool painter: TradingView-style annotation boxes with background,
// rounded border, padding, opacity, multi-line word wrap, alignment,
// letter-spacing, underline and (future-ready) rotation. Variants share the
// same painter; callouts add a pointer tail, arrow callouts add a connector
// arrow from the anchor, balloons get a speech-bubble tail. Pure canvas ops
// so the same function serves the dedicated render thread and the placement
// preview.

const rad = (deg) => (deg * Math.PI) / 180;

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Direction from the box center toward a target point (the anchor), used for
// auto pointer/tail placement on callouts.
function pointerDirection(center, target) {
  const dx = target.x - center.x; const dy = target.y - center.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

// Edge point of the box on the given side.
function edgePoint(rect, side) {
  switch (side) {
    case 'left': return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right': return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case 'up': return { x: rect.x + rect.width / 2, y: rect.y };
    default: return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }
}

// Pointer tail triangle at the given edge pointing outward.
function drawTail(ctx, rect, side, size = 12) {
  const tip = edgePoint(rect, side);
  const half = size * 0.6;
  ctx.beginPath();
  switch (side) {
    case 'left':
      ctx.moveTo(tip.x + 1, tip.y);
      ctx.lineTo(tip.x - size, tip.y - half);
      ctx.lineTo(tip.x - size, tip.y + half);
      break;
    case 'right':
      ctx.moveTo(tip.x - 1, tip.y);
      ctx.lineTo(tip.x + size, tip.y - half);
      ctx.lineTo(tip.x + size, tip.y + half);
      break;
    case 'up':
      ctx.moveTo(tip.x, tip.y + 1);
      ctx.lineTo(tip.x - half, tip.y - size);
      ctx.lineTo(tip.x + half, tip.y - size);
      break;
    default:
      ctx.moveTo(tip.x, tip.y - 1);
      ctx.lineTo(tip.x - half, tip.y + size);
      ctx.lineTo(tip.x + half, tip.y + size);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

export function renderText(ctx, drawing, transform) {
  const origin = textAnchorPoint(drawing, transform);
  if (!origin) return;
  const measure = (text, cfg) => {
    ctx.font = fontString(cfg);
    return ctx.measureText ? ctx.measureText(text).width : text.length * cfg.size * 0.6;
  };
  const layout = textLayout(drawing, transform, measure);
  if (!layout) return;
  const { cfg, boxStyle, box, rect, contentRect, lineHeight, lines, rotation } = layout;
  const color = drawing.style?.color || textColorFor(drawing.drawingType);
  const theme = themeTokens();
  const padding = boxStyle.padding;
  const boxColor = boxStyle.background || theme.card;
  const anchor = origin;
  const drawingType = drawing.drawingType;

  ctx.save();
  if (rotation) {
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    ctx.translate(center.x, center.y);
    ctx.rotate(rad(rotation));
    ctx.translate(-center.x, -center.y);
  }
  ctx.globalAlpha = boxStyle.opacity ?? 1;

  // Connector arrow for arrow callouts: from the anchor to the box edge.
  if (drawingType === 'arrowCallout') {
    const side = drawing.text?.pointer && drawing.text.pointer !== 'auto' ? drawing.text.pointer : pointerDirection({ x: rect.x + box.width / 2, y: rect.y + box.height / 2 }, anchor);
    const tip = edgePoint(rect, side);
    ctx.strokeStyle = boxStyle.border || color;
    ctx.lineWidth = Math.max(1, boxStyle.borderWidth || 1);
    ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    const angle = Math.atan2(tip.y - anchor.y, tip.x - anchor.x);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 10 * Math.cos(angle - 0.45), tip.y - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(tip.x - 10 * Math.cos(angle + 0.45), tip.y - 10 * Math.sin(angle + 0.45));
    ctx.closePath(); ctx.fill();
  }

  // Box fill + border.
  ctx.fillStyle = boxColor;
  roundedRectPath(ctx, rect.x, rect.y, box.width, box.height, boxStyle.radius);
  ctx.fill();
  if (boxStyle.borderWidth > 0) {
    ctx.strokeStyle = boxStyle.border || color;
    ctx.lineWidth = boxStyle.borderWidth;
    ctx.stroke();
  }
  if (drawingType === 'callout' || drawingType === 'balloon' || drawingType === 'arrowCallout') {
    const side = drawing.text?.pointer && drawing.text.pointer !== 'auto'
      ? drawing.text.pointer
      : pointerDirection({ x: rect.x + box.width / 2, y: rect.y + box.height / 2 }, anchor);
    ctx.fillStyle = boxColor;
    drawTail(ctx, rect, side, drawingType === 'balloon' ? 10 : 12);
  }
  ctx.globalAlpha = 1;

  // Text lines.
  ctx.font = fontString(cfg);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = cfg.align;
  if (cfg.letterSpacing) ctx.letterSpacing = `${cfg.letterSpacing}px`;
  const lineX = (align, width) => (align === 'center' ? contentRect.x + contentRect.width / 2 : align === 'right' ? contentRect.x + contentRect.width : contentRect.x);
  ctx.beginPath();
  lines.forEach((line, i) => {
    const y = contentRect.y + lineHeight * (i + 0.5);
    ctx.fillText(line, lineX(cfg.align, ctx.measureText(line).width), y);
    if (cfg.underline) {
      const width = ctx.measureText(line).width;
      const x = lineX(cfg.align, width);
      ctx.moveTo(x, y + cfg.size * 0.4);
      ctx.lineTo(x + width, y + cfg.size * 0.4);
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, cfg.size / 12);
  ctx.stroke();
  if (cfg.letterSpacing) ctx.letterSpacing = '0px';
  ctx.restore();
}

// Dedicated pass for text annotations; painted below the line/shape thread
// (with zones/positions) so annotations stack under plain drawings.
export function TextRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const theme = themeTokens();
  return (ctx) => {
    drawings.forEach((drawing) => {
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      ctx.save();
      if (isSelected || isHovered) {
        const box = estimateBox(drawing);
        ctx.strokeStyle = isSelected ? theme.accent : theme.alpha(theme.accent, 0.6);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        const origin = textAnchorPoint(drawing, transform);
        if (origin) ctx.strokeRect(origin.x - 3, origin.y - 3, box.width + 6, box.height + 6);
        ctx.setLineDash([]);
      }
      renderText(ctx, drawing, transform);
      ctx.restore();
    });
  };
}
