'use client';
import { themeTokens } from '../engine/ThemeManager';
import { PRICE_AXIS_W, TIME_AXIS_H } from '../engine/coords/AxisConstants';

export function IndicatorRenderer({ indicators = [], transform, viewport }) {
  const theme = themeTokens();
  return (ctx) => {
    if (!indicators.length) return;
    const chartW = viewport.state.width - PRICE_AXIS_W;
    const chartH = viewport.state.height - TIME_AXIS_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    indicators.forEach((indicator) => {
      ctx.save();
      if (indicator.kind === 'volume') {
        const max = Math.max(1, ...indicator.points.map((point) => point.value));
        indicator.points.forEach((point) => {
          const x = transform.timeToPixel(point.time);
          if (x == null) return;
          const h = (point.value / max) * Math.min(80, chartH * 0.2);
          ctx.fillStyle = point.rising ? theme.alpha(theme.green, 0.35) : theme.alpha(theme.red, 0.35);
          ctx.fillRect(x - Math.max(1, viewport.state.barWidth * 0.3), chartH - h, Math.max(1, viewport.state.barWidth * 0.6), h);
        });
      } else if (indicator.kind === 'histogram') {
        indicator.points.forEach((point) => {
          const x = transform.timeToPixel(point.time);
          if (x == null) return;
          const mid = chartH * 0.83;
          const h = point.price * 8;
          ctx.fillStyle = point.price >= 0 ? theme.green : theme.red;
          ctx.fillRect(x - 1, mid - Math.max(0, h), 2, Math.abs(h));
        });
      } else if (indicator.kind === 'rsi') {
        const top = chartH * 0.74;
        const bottom = chartH * 0.94;
        ctx.strokeStyle = theme.alpha(theme.gold, 0.35);
        [30, 70].forEach((value) => {
          const y = bottom - value / 100 * (bottom - top);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        });
        ctx.strokeStyle = indicator.color || theme.gold;
        ctx.beginPath(); let started = false;
        indicator.points.forEach((point) => {
          const x = transform.timeToPixel(point.time);
          if (x == null) return;
          const y = bottom - point.price / 100 * (bottom - top);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        ctx.strokeStyle = indicator.color || theme.accent;
        ctx.lineWidth = 1.25;
        ctx.beginPath(); let started = false;
        indicator.points.forEach((point) => {
          const p = transform.anchorToPixel(point);
          if (!p) return;
          if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
  };
}
