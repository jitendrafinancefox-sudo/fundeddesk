'use client';
import { positionZones, positionColorFor } from './PositionGeometry';
import { riskCalculator, fmtPrice, fmtMoney, fmtPercent, fmtRR } from './RiskCalculator';
import { themeTokens } from '../engine/ThemeManager';

// Position-tool painter: green profit zone (entry→TP), red risk zone
// (entry→SL), solid entry line, dashed SL/TP lines, and TradingView-style
// price pills + R:R badge. Pure canvas ops so the same function serves the
// dedicated render thread and the placement preview. Label sections can be
// toggled through style (showLabels / showRR / showRisk), matching the
// zone/channel panel pattern. All colors come from the ThemeManager so dark
// and light themes paint identically except for the colors themselves.

const labelPill = (ctx, text, x, y, align, bg, fg) => {
  ctx.font = '600 9.5px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width + 10;
  const left = align === 'right' ? x - width : x;
  ctx.fillStyle = bg;
  ctx.fillRect(left, y - 8, width, 16);
  ctx.fillStyle = fg;
  ctx.fillText(text, align === 'right' ? x - 5 : x + 5, y + 0.5);
  return width;
};

export function renderPosition(ctx, drawing, transform) {
  const zones = positionZones(drawing, transform);
  if (!zones) return;
  const calc = riskCalculator(drawing);
  if (!calc) return;
  const theme = themeTokens();
  const style = drawing.style || {};
  const color = style.color || positionColorFor(drawing.drawingType);
  const lineWidth = style.lineWidth || 1.5;
  const fillOpacity = style.opacity ?? 0.14;
  const pillBg = theme.alpha(theme.card, 0.85);
  const left = zones.left;
  const right = zones.right;

  // Profit + risk zones (bounded by the anchors' x-extent, below the lines).
  ctx.save();
  if (zones.rewardBottom > zones.rewardTop) {
    ctx.globalAlpha = fillOpacity; ctx.fillStyle = theme.green;
    ctx.fillRect(left, zones.rewardTop, right - left, zones.rewardBottom - zones.rewardTop);
  }
  if (zones.riskBottom > zones.riskTop) {
    ctx.globalAlpha = fillOpacity; ctx.fillStyle = theme.red;
    ctx.fillRect(left, zones.riskTop, right - left, zones.riskBottom - zones.riskTop);
  }
  ctx.restore();

  // Lines: entry solid in the tool color, SL red dashed, TP green dashed.
  ctx.lineWidth = lineWidth;
  const line = (y, stroke, dash) => {
    ctx.save(); ctx.strokeStyle = stroke; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.restore();
  };
  line(zones.entry.y, color, []);
  if (Math.abs(zones.sl.y - zones.entry.y) > 1) line(zones.sl.y, theme.red, [6, 4]);
  if (Math.abs(zones.tp.y - zones.entry.y) > 1) line(zones.tp.y, theme.green, [6, 4]);

  if (style.showLabels !== false) {
    const side = right - 8;
    ctx.textAlign = 'right';
    labelPill(ctx, `ENTRY ${fmtPrice(calc.entry)}`, side, zones.entry.y, 'right', pillBg, color);
    if (Math.abs(zones.sl.y - zones.entry.y) > 1) labelPill(ctx, `SL ${fmtPrice(calc.sl)}`, side, zones.sl.y, 'right', pillBg, theme.red);
    if (Math.abs(zones.tp.y - zones.entry.y) > 1) labelPill(ctx, `TP ${fmtPrice(calc.tp)}`, side, zones.tp.y, 'right', pillBg, theme.green);
  }
  if (style.showRisk !== false) {
    const tag = calc.isLong ? 'LONG' : 'SHORT';
    const text = `${tag}  ${fmtMoney(calc.riskAmount)}${calc.riskPercent != null ? ` (${fmtPercent(calc.riskPercent)})` : ''}`;
    ctx.textAlign = 'left';
    labelPill(ctx, text, left + 8, zones.entry.y, 'left', pillBg, color);
  }
  if (style.showRR !== false) {
    const text = `${fmtRR(calc.rr)}  ${fmtMoney(calc.rewardAmount)}`;
    ctx.textAlign = 'right';
    labelPill(ctx, text, right - 8, zones.top - 18, 'right', pillBg, theme.text);
  }
}

// Dedicated pass for position drawings (green/red zone painting + labels).
// Painted below the line/shape thread like zones; selection is communicated
// by an outline box plus the interaction's handles.
export function PositionRenderer({ drawings, transform, selectedId, selectedIds, hoverId }) {
  const selectedSet = selectedIds ? new Set(selectedIds) : null;
  return (ctx) => {
    drawings.forEach((drawing) => {
      const isSelected = selectedSet ? selectedSet.has(drawing.id) : drawing.id === selectedId;
      const isHovered = hoverId != null && hoverId === drawing.id && !isSelected;
      ctx.save();
      renderPosition(ctx, drawing, transform);
      if (isSelected) {
        const zones = positionZones(drawing, transform);
        if (zones) {
          const theme = themeTokens();
          ctx.strokeStyle = theme.alpha(theme.text, 0.85);
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(zones.left - 3, zones.top - 3, Math.max(1, zones.right - zones.left + 6), zones.bottom - zones.top + 6);
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
    });
  };
}
