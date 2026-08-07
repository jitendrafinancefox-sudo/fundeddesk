'use client';
import { themeTokens } from '../engine/ThemeManager';
import { PRICE_AXIS_W, TIME_AXIS_H } from '../engine/coords/AxisConstants';

const MIN_LABEL_GAP = 46;
const SEP_LABEL_EXCLUSION = 58;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

function dayKey(ts) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthKey(ts) {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function formatDayLabel(ts) {
  const d = new Date(ts * 1000);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

function formatMonthLabel(ts) {
  const d = new Date(ts * 1000);
  return MONTHS[d.getMonth()];
}

function formatMonthYearLabel(ts) {
  const d = new Date(ts * 1000);
  return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
}

function formatYearLabel(ts) {
  return String(new Date(ts * 1000).getFullYear());
}

function formatTimeLabel(ts) {
  const d = new Date(ts * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimeAxisRenderer({ viewport, timeTicks = [], visibleCandles = [] }) {
  const t = themeTokens();
  return (ctx) => {
    ctx.save();
    const w = viewport.state.width;
    const h = viewport.state.height;
    const chartW = w - PRICE_AXIS_W;
    const axisTop = h - TIME_AXIS_H;
    const axisMid = axisTop + TIME_AXIS_H / 2;

    // Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, axisTop, w, TIME_AXIS_H);

    // Border line
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisTop + 0.5);
    ctx.lineTo(chartW, axisTop + 0.5);
    ctx.stroke();

    // Corner (price axis + time axis intersection)
    ctx.fillStyle = t.bg;
    ctx.fillRect(chartW, axisTop, PRICE_AXIS_W, TIME_AXIS_H);
    ctx.beginPath();
    ctx.moveTo(chartW + 0.5, axisTop);
    ctx.lineTo(chartW + 0.5, h);
    ctx.stroke();

    // Day and month separators (date transitions inside the visible range)
    const daySeparators = [];
    const monthSeparators = [];
    if (visibleCandles.length > 1) {
      let prevDay = dayKey(visibleCandles[0].candle.time);
      let prevMonth = monthKey(visibleCandles[0].candle.time);
      for (let i = 1; i < visibleCandles.length; i++) {
        const curDay = dayKey(visibleCandles[i].candle.time);
        const curMonth = monthKey(visibleCandles[i].candle.time);
        const prevX = viewport.indexToX(visibleCandles[i - 1].index);
        const curX = viewport.indexToX(visibleCandles[i].index);
        const sepX = (prevX + curX) / 2;
        if (curDay !== prevDay) {
          daySeparators.push({ x: sepX, time: visibleCandles[i].candle.time, index: visibleCandles[i].index });
          prevDay = curDay;
        }
        if (curMonth !== prevMonth) {
          monthSeparators.push({ x: sepX, time: visibleCandles[i].candle.time, index: visibleCandles[i].index });
          prevMonth = curMonth;
        }
      }
    }

    const drawSeparatorLine = (x, alpha) => {
      if (x < 0 || x > chartW) return;
      ctx.save();
      ctx.strokeStyle = t.line;
      ctx.globalAlpha = alpha;
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, axisTop);
      ctx.stroke();
      ctx.restore();
    };

    // --- Label mode ---------------------------------------------------------
    // Adaptive tiers from intraday out to years, exactly the TradingView
    // axis sequence: step < 1d → intraday HH:MM labels at candle centers plus
    // right-aligned date labels at day transitions; 1d–1M → date labels
    // ("05 Aug") with the month name replacing the first day label of each
    // month; 1M–1y → "Aug '26" month labels; ≥ 1y → "2026" year labels.
    const step = timeTicks.step || 0;
    const intraday = step < 86400;
    const dateMode = step >= 86400 && step < 2592000;
    const monthMode = step >= 2592000 && step < 31536000;
    const yearMode = step >= 31536000;
    ctx.font = '500 11px Inter, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.2px';
    ctx.textBaseline = 'middle';
    const usedSegments = [];

    if (dateMode) {
      ctx.fillStyle = t.muted;
      ctx.textAlign = 'center';
      const monthStartIndices = new Set(monthSeparators.map((s) => s.index));
      timeTicks.forEach(({ x, candle, index }) => {
        if (x < 0 || x > chartW || !candle) return;
        const label = monthStartIndices.has(index) ? formatMonthLabel(candle.time) : formatDayLabel(candle.time);
        const lw = ctx.measureText(label).width;
        if (x - lw / 2 < 2) return; // keep half-clipped labels off the edge
        const labelLeft = x - lw / 2;
        const labelRight = x + lw / 2;
        if (usedSegments.some((seg) => labelLeft < seg.right + MIN_LABEL_GAP && labelRight > seg.left - MIN_LABEL_GAP)) return;
        ctx.fillText(label, x, axisMid + 0.5);
        usedSegments.push({ left: labelLeft, right: labelRight });
      });
    } else if (monthMode || yearMode) {
      // Month/year tiers: labels at tick centers (ticks land on epoch-aligned
      // boundaries; labels derive from the actual calendar date so they always
      // read the real month/year).
      ctx.fillStyle = t.muted;
      ctx.textAlign = 'center';
      timeTicks.forEach(({ x, candle }) => {
        if (x < 0 || x > chartW || !candle) return;
        const label = monthMode ? formatMonthYearLabel(candle.time) : formatYearLabel(candle.time);
        const lw = ctx.measureText(label).width;
        if (x - lw / 2 < 2) return; // keep half-clipped labels off the edge
        const labelLeft = x - lw / 2;
        const labelRight = x + lw / 2;
        if (usedSegments.some((seg) => labelLeft < seg.right + MIN_LABEL_GAP && labelRight > seg.left - MIN_LABEL_GAP)) return;
        ctx.fillText(label, x, axisMid + 0.5);
        usedSegments.push({ left: labelLeft, right: labelRight });
      });
    } else {
      // Intraday time labels — aligned to candle centers (ticks are snapped)
      timeTicks.forEach(({ x, candle }) => {
        if (x < 0 || x > chartW || !candle) return;
        // Don't fight the date labels at day/month transitions.
        if (daySeparators.some((s) => Math.abs(s.x - x) < SEP_LABEL_EXCLUSION)) return;
        if (monthSeparators.some((s) => Math.abs(s.x - x) < SEP_LABEL_EXCLUSION)) return;
        const label = formatTimeLabel(candle.time);
        ctx.font = '500 11px Inter, sans-serif';
        const lw = ctx.measureText(label).width;
        if (x - lw / 2 < 2) return; // keep half-clipped labels off the edge
        const labelLeft = x - lw / 2;
        const labelRight = x + lw / 2;
        if (usedSegments.some((seg) => labelLeft < seg.right + MIN_LABEL_GAP && labelRight > seg.left - MIN_LABEL_GAP)) return;
        ctx.fillStyle = t.muted;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, axisMid + 0.5);
        usedSegments.push({ left: labelLeft, right: labelRight });
      });

      // Date labels at day transitions — right-aligned just before the
      // separator, so they read "29 Jul | 30 Jul |" like TradingView.
      const drawDateLabels = (list, formatter) => {
        list.forEach(({ x, time }) => {
          if (x < 0 || x > chartW) return;
          const label = formatter(time);
          ctx.font = '500 11px Inter, sans-serif';
          const lw = ctx.measureText(label).width;
          const labelRight = x - 5;
          const labelLeft = labelRight - lw;
          if (labelLeft < 2) return; // keep half-clipped labels off the edge
          if (usedSegments.some((seg) => labelLeft < seg.right + 10 && labelRight > seg.left - 10)) return;
          ctx.fillStyle = t.dim;
          ctx.textAlign = 'right';
          ctx.fillText(label, labelRight, axisMid + 0.5);
          usedSegments.push({ left: labelLeft, right: labelRight });
        });
      };

      daySeparators.forEach(({ x }) => drawSeparatorLine(x, 0.4));
      monthSeparators.forEach(({ x }) => drawSeparatorLine(x, 0.6));

      const monthBoundaryKeys = new Set(monthSeparators.map(({ time }) => monthKey(time)));
      const nonMonthDays = daySeparators.filter(({ time }) => !monthBoundaryKeys.has(monthKey(time)));
      drawDateLabels(nonMonthDays, formatDayLabel);
      drawDateLabels(monthSeparators, formatMonthLabel);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    ctx.restore();
  };
}
