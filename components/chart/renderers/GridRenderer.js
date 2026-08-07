'use client';
import { themeTokens } from '../engine/ThemeManager';
import { PRICE_AXIS_W, TIME_AXIS_H } from '../engine/coords/AxisConstants';

// Local-date key for month/year boundary detection (aligned with the axis
// renderer's day-transition handling).
function periodKey(ts, isYear) {
  const d = new Date(ts * 1000);
  return isYear ? String(d.getFullYear()) : `${d.getFullYear()}-${d.getMonth()}`;
}

// TradingView-style grid: hairline 1px lines, barely-there so the candles and
// price action own the visual weight. Major (round price) lines are slightly
// stronger than minor; vertical time lines match the minor weight. Intraday
// charts add IST session lines (09:15 open / 15:30 close) per day, daily/weekly
// charts add month-boundary lines, monthly+ charts add year-boundary lines.
export function GridRenderer({ viewport, priceTicks = [], timeTicks = [], color, transform, visibleCandles = [] }) {
  const t = themeTokens();
  const isLight = typeof document !== 'undefined' ? !document.documentElement.classList.contains('light-theme') : true;
  const majorColor = color || (isLight ? 'rgba(19,23,34,0.07)' : t.alpha(t.muted, 0.10));
  const minorColor = color || (isLight ? 'rgba(19,23,34,0.035)' : t.alpha(t.muted, 0.05));
  const verticalColor = color || (isLight ? 'rgba(19,23,34,0.05)' : t.alpha(t.muted, 0.07));
  return (ctx) => {
    const chartW = viewport.state.width - PRICE_AXIS_W;
    const chartH = viewport.state.height - TIME_AXIS_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    // Session and period separators, adaptive to the candle interval:
    // intraday → session lines per day; daily/weekly → month boundaries;
    // monthly+ → year boundaries.
    if (transform && visibleCandles.length > 1) {
      const interval = visibleCandles[1].candle.time - visibleCandles[0].candle.time;
      if (interval > 0 && interval < 86400) {
        // IST-ish session (09:15–15:30) derived from local dates so the lines
        // align with the axis day transitions.
        const days = new Map();
        visibleCandles.forEach(({ candle }) => {
          const d = new Date(candle.time * 1000);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (days.has(key)) return;
          const open = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 15).getTime() / 1000;
          const close = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 30).getTime() / 1000;
          days.set(key, [open, close]);
        });
        ctx.strokeStyle = t.alpha(t.muted, 0.3);
        ctx.lineWidth = 1;
        days.forEach((bounds) => {
          for (let i = 0; i < bounds.length; i++) {
            const x = transform.timeToPixel(bounds[i]);
            if (x == null || x < 0 || x > chartW) continue;
            const xx = Math.round(x) + 0.5;
            ctx.beginPath();
            ctx.moveTo(xx, 0);
            ctx.lineTo(xx, chartH);
            ctx.stroke();
          }
        });
      } else if (interval >= 86400) {
        const isYear = interval >= 2592000;
        const seps = [];
        let prevKey = periodKey(visibleCandles[0].candle.time, isYear);
        for (let i = 1; i < visibleCandles.length; i++) {
          const key = periodKey(visibleCandles[i].candle.time, isYear);
          if (key === prevKey) continue;
          prevKey = key;
          const prevX = viewport.indexToX(visibleCandles[i - 1].index);
          const curX = viewport.indexToX(visibleCandles[i].index);
          seps.push((prevX + curX) / 2);
        }
        if (seps.length <= 300) {
          ctx.strokeStyle = t.alpha(t.muted, isYear ? 0.3 : 0.22);
          ctx.lineWidth = 1;
          for (let i = 0; i < seps.length; i++) {
            const x = Math.round(seps[i]) + 0.5;
            if (x < 0 || x > chartW) continue;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, chartH);
            ctx.stroke();
          }
        }
      }
    }

    // Horizontal price grid lines — major/minor
    if (priceTicks.length) {
      priceTicks.forEach(({ y, major }) => {
        if (y < 0 || y > chartH) return;
        const yy = Math.round(y) + 0.5;
        ctx.beginPath();
        ctx.strokeStyle = major ? majorColor : minorColor;
        ctx.lineWidth = 1;
        ctx.moveTo(0, yy);
        ctx.lineTo(chartW, yy);
        ctx.stroke();
      });
    }

    // Vertical time grid lines
    if (timeTicks.length) {
      timeTicks.forEach(({ x }) => {
        if (x < 0 || x > chartW) return;
        const xx = Math.round(x) + 0.5;
        ctx.beginPath();
        ctx.strokeStyle = verticalColor;
        ctx.lineWidth = 1;
        ctx.moveTo(xx, 0);
        ctx.lineTo(xx, chartH);
        ctx.stroke();
      });
    }

    // Fallback: proportional grid if no ticks provided
    if (!priceTicks.length && !timeTicks.length) {
      ctx.strokeStyle = majorColor;
      ctx.lineWidth = 1;
      for (let row = 1; row < 6; row += 1) {
        const y = Math.round((chartH / 6) * row) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(chartW, y);
        ctx.stroke();
      }
      for (let col = 1; col < 8; col += 1) {
        const x = Math.round((chartW / 8) * col) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, chartH);
        ctx.stroke();
      }
    }

    ctx.restore();
  };
}
