'use client';
import { themeTokens } from '../engine/ThemeManager';
import { fmtPrice } from '../engine/coords/CoordinateUtils';
import { PRICE_AXIS_W, TIME_AXIS_H } from '../engine/coords/AxisConstants';

const BADGE_H = 20;
const BADGE_W = 54;

// TradingView-style crosshair: thin solid lines spanning the plot area plus
// rounded price badge on the price axis. The badge is pushed away from the
// live price badge when the cursor is near the last close.
export function CrosshairRenderer({ crosshair, viewport, candles, visibleCandles }) {
  const t = themeTokens();
  return (ctx) => {
    if (!crosshair) return;
    ctx.save();
    const w = viewport.state.width;
    const h = viewport.state.height;
    const chartW = w - PRICE_AXIS_W;
    const chartH = h - TIME_AXIS_H;

    // Hovered-candle highlight: a soft column at the crosshair's candle,
    // drawn here (overlay) so crosshair moves never repaint the base cache.
    if (crosshair.x >= 0 && crosshair.x <= chartW) {
      const index = Math.round(viewport.xToIndex(crosshair.x));
      const entry = visibleCandles?.find((e) => e.index === index);
      const candle = entry?.candle;
      const hx = Math.round(viewport.indexToX(index)) + 0.5;
      const barW = Math.max(1, Math.round(viewport.state.barWidth));
      ctx.fillStyle = t.alpha(t.muted, 0.08);
      ctx.fillRect(Math.round(hx - barW / 2), 0, barW, chartH);
      if (candle) {
        const y0 = viewport.priceToY(Math.min(candle.open, candle.close));
        const y1 = viewport.priceToY(Math.max(candle.open, candle.close));
        ctx.fillStyle = t.alpha('#ffffff', 0.14);
        ctx.fillRect(Math.round(hx - barW / 2), y1, barW, Math.max(1, y0 - y1));
      }
    }

    // Vertical crosshair line — thin solid
    if (crosshair.x >= 0 && crosshair.x <= chartW) {
      ctx.strokeStyle = t.alpha(t.muted, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(crosshair.x) + 0.5, 0);
      ctx.lineTo(Math.round(crosshair.x) + 0.5, chartH);
      ctx.stroke();
    }
    // Horizontal crosshair line — thin solid
    if (crosshair.y >= 0 && crosshair.y <= chartH) {
      ctx.strokeStyle = t.alpha(t.muted, 0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(crosshair.y) + 0.5);
      ctx.lineTo(chartW, Math.round(crosshair.y) + 0.5);
      ctx.stroke();
    }

    // Price badge on price axis (right side) — rounded rect, vertically
    // centered on the crosshair line, TradingView blue-grey on the axis.
    if (crosshair.price != null && crosshair.y >= 0 && crosshair.y <= chartH) {
      const entry = visibleCandles?.find((e) => e.candle.time === crosshair.time);
      const candle = entry?.candle;
      const green = candle ? candle.close >= candle.open : true;
      const badgeColor = green ? t.green : t.red;
      const label = fmtPrice(crosshair.price);

      // Keep clear of the live price badge on the last close.
      let by = Math.round(crosshair.y) - BADGE_H / 2;
      if (candles && candles.length > 0) {
        const lastY = viewport.priceToY(candles[candles.length - 1].close);
        if (Math.abs(crosshair.y - lastY) < BADGE_H + 4) {
          by = crosshair.y > lastY ? lastY + 4 : lastY - BADGE_H - 4;
        }
      }
      by = Math.max(2, Math.min(h - BADGE_H - 2, by));

      let font = '500 11px Inter, sans-serif';
      ctx.font = font;
      let tw = ctx.measureText(label).width;
      if (tw + 14 > PRICE_AXIS_W - 4) {
        font = '500 10px Inter, sans-serif';
        ctx.font = font;
        tw = ctx.measureText(label).width;
      }
      const bw = Math.min(Math.max(tw + 14, 44), BADGE_W);
      const r = 3;
      const bx = chartW;
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
      ctx.fillStyle = badgeColor;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.2px';
      ctx.fillText(label, bx + bw / 2, by + BADGE_H / 2 + 0.5);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    // Time tooltip — TradingView two-line badge: date line + time line, e.g.
    // "Tue, 05 Aug '26" over "03:45 PM". Drawn here (overlay) so crosshair
    // moves never repaint the cached base layer.
    if (crosshair.time != null) {
      const cx = crosshair.x;
      const date = new Date(crosshair.time * 1000);
      const line1 = `${date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}, '${String(date.getFullYear()).slice(-2)}`;
      const line2 = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      ctx.font = '500 11px Inter, sans-serif';
      const w1 = ctx.measureText(line1).width;
      const w2 = ctx.measureText(line2).width;
      const bw = Math.max(w1, w2) + 18;
      const bh = 34;
      const bx = Math.max(4, Math.min(chartW - bw - 4, cx - bw / 2));
      const by = chartH - TIME_AXIS_H - 5;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
      ctx.lineTo(bx + r, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fillStyle = '#2962ff';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.2px';
      ctx.fillText(line1, bx + bw / 2, by + 12.5);
      ctx.fillText(line2, bx + bw / 2, by + 24.5);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    ctx.restore();
  };
}
