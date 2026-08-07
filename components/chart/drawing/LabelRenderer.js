'use client';
import { themeTokens } from '../engine/ThemeManager';
import { resolveFont, fontString } from './FontManager';
import { textAnchorPoint, textColorFor } from './TextGeometry';
import { fmtPrice } from './RiskCalculator';

// Label painter (price / time / custom pills). Price labels show the anchor's
// raw price; time labels show the anchor's timestamp; custom labels render
// their content. Auto position keeps the pill anchored to the point: 'auto'
// means right of the anchor, explicit sides place the pill left/right/above/below.

const fmtTime = (time) => new Date(time * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function pillRect(anchor, width, height, side) {
  switch (side) {
    case 'left': return { x: anchor.x - width - 8, y: anchor.y - height / 2, width, height };
    case 'above': return { x: anchor.x - width / 2, y: anchor.y - height - 8, width, height };
    case 'below': return { x: anchor.x - width / 2, y: anchor.y + 8, width, height };
    default: return { x: anchor.x + 8, y: anchor.y - height / 2, width, height };
  }
}

function drawLabelPill(ctx, drawing, transform) {
  const anchor = textAnchorPoint(drawing, transform);
  if (!anchor) return;
  const cfg = resolveFont(drawing);
  let content = drawing.text?.content || '';
  if (drawing.drawingType === 'priceLabel') {
    let price = drawing.anchorPoints[0]?.price;
    content = fmtPrice(price);
  } else if (drawing.drawingType === 'timeLabel') {
    content = fmtTime(drawing.anchorPoints[0]?.time);
  }
  if (!content) return null;
  ctx.save();
  ctx.font = fontString(cfg);
  const width = (ctx.measureText ? ctx.measureText(content).width : content.length * cfg.size * 0.6) + 12;
  const height = cfg.size + 10;
  const side = drawing.text?.side && drawing.text.side !== 'auto' ? drawing.text.side : 'right';
  const rect = pillRect(anchor, width, height, side);
  const color = drawing.style?.color || textColorFor(drawing.drawingType);
  const boxStyle = drawing.text?.boxStyle || {};
  const theme = themeTokens();
  ctx.globalAlpha = boxStyle.opacity ?? 1;
  ctx.fillStyle = boxStyle.background || theme.card;
  ctx.strokeStyle = boxStyle.border || theme.line2;
  ctx.lineWidth = boxStyle.borderWidth || 1;
  ctx.beginPath();
  const radius = height / 2;
  ctx.moveTo(rect.x + radius, rect.y);
  ctx.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, radius);
  ctx.arcTo(rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, radius);
  ctx.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, radius);
  ctx.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
  ctx.closePath();
  ctx.fill();
  if (boxStyle.borderWidth > 0) ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(content, rect.x + rect.width / 2, rect.y + rect.height / 2 + 0.5);
  ctx.restore();
  return rect;
}

export function renderLabel(ctx, drawing, transform) {
  drawLabelPill(ctx, drawing, transform);
}

// Dedicated pass for label pills.
export function LabelRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const theme = themeTokens();
  return (ctx) => {
    drawings.forEach((drawing) => {
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      const rect = drawLabelPill(ctx, drawing, transform);
      if (rect && (isSelected || isHovered)) {
        ctx.save();
        ctx.strokeStyle = isSelected ? theme.accent : theme.alpha(theme.accent, 0.6);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6);
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  };
}
