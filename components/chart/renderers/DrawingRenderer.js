'use client';
import { isZoneType, isFibType, isStrokeType, isTextType, isPositionType, isChannelType } from '../drawing/DrawingDefinitions';
import { polygonCorners, polygonBounds } from '../drawing/ShapeGeometry';
import { themeTokens } from '../engine/ThemeManager';

const segment = (ctx, a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
const fmtPrice = (price) => price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderByType(ctx, drawing, a, b, points, isSelected, theme) {
  const type = drawing.drawingType;

  switch (type) {
    case 'trend':
      segment(ctx, a, b);
      break;

    case 'hline':
      ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke();
      break;

    case 'vline':
      ctx.beginPath(); ctx.moveTo(a.x, 0); ctx.lineTo(a.x, ctx.canvas.height); ctx.stroke();
      break;

    case 'horizontalRay':
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke();
      break;

    case 'infoLine':
      ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke();
      {
        const price = drawing.anchorPoints[0]?.price ?? 0;
        const text = `${(drawing.symbol || 'INFO').toUpperCase()}  ${fmtPrice(price)}`;
        ctx.font = '600 9.5px Inter, sans-serif';
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        const w = ctx.measureText(text).width + 12;
        ctx.fillStyle = theme.alpha(theme.card, 0.92);
        ctx.fillRect(4, a.y - 9, w, 17);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(text, 10, a.y + 0.5);
      }
      break;

    case 'rect':
    case 'rotatedRect':
    case 'triangle':
      {
        const corners = polygonCorners(points);
        ctx.beginPath();
        for (let i = 0; i < corners.length; i++) {
          if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
          else ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath(); ctx.stroke();
      }
      break;

    case 'circle':
      {
        const corners = polygonCorners(points);
        const box = polygonBounds(corners);
        const side = Math.max(box.width, box.height);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, side / 2, side / 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      break;

    case 'ellipse':
      {
        const corners = polygonCorners(points);
        const box = polygonBounds(corners);
        ctx.beginPath();
        ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width / 2, box.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 'ray':
      {
        const t = 10000;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        ctx.stroke();
      }
      break;

    case 'extended':
      {
        const t = 10000;
        ctx.beginPath();
        ctx.moveTo(a.x - (b.x - a.x) * t, a.y - (b.y - a.y) * t);
        ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        ctx.stroke();
      }
      break;

    case 'crossline':
      ctx.beginPath();
      ctx.moveTo(a.x, 0);
      ctx.lineTo(a.x, ctx.canvas.height);
      ctx.moveTo(0, a.y);
      ctx.lineTo(ctx.canvas.width, a.y);
      ctx.stroke();
      break;

    case 'doubleArrow':
      segment(ctx, a, b);
      {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 10 * Math.cos(angle - 0.45), b.y - 10 * Math.sin(angle - 0.45));
        ctx.lineTo(b.x - 10 * Math.cos(angle + 0.45), b.y - 10 * Math.sin(angle + 0.45));
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + 10 * Math.cos(angle - 0.45), a.y + 10 * Math.sin(angle - 0.45));
        ctx.lineTo(a.x + 10 * Math.cos(angle + 0.45), a.y + 10 * Math.sin(angle + 0.45));
        ctx.closePath(); ctx.fill();
      }
      break;

    case 'arrow':
      segment(ctx, a, b);
      {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 10 * Math.cos(angle - 0.45), b.y - 10 * Math.sin(angle - 0.45));
        ctx.lineTo(b.x - 10 * Math.cos(angle + 0.45), b.y - 10 * Math.sin(angle + 0.45));
        ctx.closePath(); ctx.fill();
      }
      break;

    case 'arrowMarkUp':
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 8);
      ctx.lineTo(a.x - 5.5, a.y + 4);
      ctx.lineTo(a.x + 5.5, a.y + 4);
      ctx.closePath(); ctx.fill();
      break;

    case 'arrowMarkDown':
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + 8);
      ctx.lineTo(a.x - 5.5, a.y - 4);
      ctx.lineTo(a.x + 5.5, a.y - 4);
      ctx.closePath(); ctx.fill();
      break;

    case 'measure':
      segment(ctx, a, b);
      {
        const p1 = drawing.anchorPoints[0]?.price ?? 0;
        const p2 = drawing.anchorPoints[1]?.price ?? p1;
        const diff = Math.abs(p2 - p1);
        const pct = p1 ? ((p2 - p1) / p1) * 100 : null;
        const text = `${pct == null ? '—' : (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'}  ${fmtPrice(diff)}`;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(text).width;
        const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2;
        ctx.fillStyle = theme.alpha(theme.card, 0.85);
        ctx.fillRect(mx - tw / 2 - 5, my - 8, tw + 10, 16);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(text, mx, my);
      }
      break;

    default:
      segment(ctx, a, b);
      break;
  }
}

export function DrawingRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  const theme = themeTokens();
  return (ctx) => {
    drawings.forEach((drawing) => {
      if (isZoneType(drawing.drawingType) || isFibType(drawing.drawingType) || isStrokeType(drawing.drawingType) || isTextType(drawing.drawingType) || isPositionType(drawing.drawingType) || isChannelType(drawing.drawingType)) return;
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (!points.length) return;
      const [a, b = a] = points;
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      ctx.save();
      ctx.strokeStyle = isSelected ? theme.accent : isHovered ? theme.alpha(theme.accent, 0.6) : (drawing.style?.color || theme.gold);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = (drawing.style?.lineWidth || 1.5) + (isHovered ? 1 : 0);
      renderByType(ctx, drawing, a, b, points, isSelected, theme);
      // TradingView-style selection outline: dashed border around selected drawings
      if (isSelected && !isStrokeType(drawing.drawingType)) {
        ctx.save();
        ctx.strokeStyle = theme.alpha(theme.accent, 0.5);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        // Draw a bounding box around the drawing's points
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs) - 6;
        const maxX = Math.max(...xs) + 6;
        const minY = Math.min(...ys) - 6;
        const maxY = Math.max(...ys) + 6;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
      }
      ctx.restore();
    });
  };
}
