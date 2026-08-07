'use client';
import { themeTokens } from '../engine/ThemeManager';
import { fmtPrice } from '../engine/coords/CoordinateUtils';
import { PRICE_AXIS_W } from '../engine/coords/AxisConstants';

const BADGE_H = 20;

export function AxisRenderer({ viewport, priceTicks = [], crosshair, visibleCandles, candles }) {
  const t = themeTokens();
  return (ctx) => {
    ctx.save();
    const w = viewport.state.width;
    const h = viewport.state.height;
    const chartW = w - PRICE_AXIS_W;

    // Opaque background
    ctx.fillStyle = t.bg;
    ctx.fillRect(chartW, 0, PRICE_AXIS_W, h);

    // Subtle border line
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartW + 0.5, 0);
    ctx.lineTo(chartW + 0.5, h);
    ctx.stroke();

    // Price tick labels — Inter 11px weight 500, right-aligned at the axis
    // edge with a tight 8px margin (TradingView spacing), slightly tighter
    // letter-spacing. Labels stay clear of the live-price badge and shrink
    // (step-exact precision first, then font size) instead of clipping.
    const maxLabelW = PRICE_AXIS_W - 8;
    const lastCloseY = candles && candles.length ? viewport.priceToY(candles[candles.length - 1].close) : null;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.2px';
    priceTicks.forEach(({ y, label, major, price, step }) => {
      if (!major || !label) return;
      if (y < 6 || y > h - 6) return;
      if (lastCloseY != null && Math.abs(y - lastCloseY) < 12) return;
      let font = '500 11px Inter, sans-serif';
      ctx.font = font;
      let text = label;
      let tw = ctx.measureText(text).width;
      if (tw > maxLabelW && step != null) {
        // Large step → the exact label is already compact; drop the badge-style
        // 2-decimal rendering only when the step is integral (safe to round).
        const compact = fmtPrice(price, Math.max(step, 1));
        if (compact !== text) {
          text = compact;
          tw = ctx.measureText(text).width;
        }
      }
      if (tw > maxLabelW) {
        font = '500 10px Inter, sans-serif';
        ctx.font = font;
        tw = ctx.measureText(text).width;
      }
      ctx.fillStyle = t.muted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w - 8, y);
    });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // Current price badge + dotted line
    if (candles && candles.length > 0) {
      const last = candles[candles.length - 1];
      const badgeY = viewport.priceToY(last.close);
      const green = last.close >= last.open;
      const color = green ? t.green : t.red;

      // Dotted price line across chart — very subtle
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([1, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(badgeY) + 0.5);
      ctx.lineTo(chartW, Math.round(badgeY) + 0.5);
      ctx.stroke();
      ctx.restore();

      // Current price badge — rounded rect on the axis, vertically centered
      // on the price line. Text auto-shrinks when the value is too wide for
      // the strip (TradingView behaviour for large prices).
      const label = fmtPrice(last.close);
      let font = '500 11px Inter, sans-serif';
      ctx.font = font;
      let tw = ctx.measureText(label).width;
      if (tw + 14 > PRICE_AXIS_W - 4) {
        font = '500 10px Inter, sans-serif';
        ctx.font = font;
        tw = ctx.measureText(label).width;
      }
      const bw = Math.min(Math.max(tw + 14, 44), PRICE_AXIS_W - 4);
      const r = 3;
      const bx = chartW;
      const by = Math.round(badgeY) - BADGE_H / 2;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + BADGE_H - r);
      ctx.quadraticCurveTo(bx + bw, by + BADGE_H, bx + bw - r, by + BADGE_H);
      ctx.lineTo(bx + r, by + BADGE_H);
      ctx.quadraticCurveTo(bx, by + BADGE_H, bx, by + BADGE_H - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.2px';
      ctx.fillText(label, bx + bw / 2, by + BADGE_H / 2 + 0.5);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    ctx.restore();
  };
}
