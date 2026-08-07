'use client';
import { themeTokens } from '../engine/ThemeManager';
import { PRICE_AXIS_W, TIME_AXIS_H } from '../engine/coords/AxisConstants';

const BODY_RATIO = 0.7;

export function CandleRenderer({ viewport, visibleCandles }) {
  return (ctx) => {
    const t = themeTokens();
    const barWidth = viewport.state.barWidth;
    const width = Math.max(1, Math.round(barWidth * BODY_RATIO));
    // High-density mode: solid bars at full bar width (wicks still extend the
    // high/low) instead of thin wick-only stubs, so heavily zoomed-out charts
    // read as solid TradingView-style bars.
    const dense = barWidth < 3;
    const solidWidth = dense ? Math.max(1, Math.round(barWidth)) : width;
    const chartW = viewport.state.width - PRICE_AXIS_W;
    const chartH = viewport.state.height - TIME_AXIS_H;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartW, chartH);
    ctx.clip();

    ctx.lineWidth = 1;
    visibleCandles.forEach(({ candle, index }) => {
      const x = Math.round(viewport.indexToX(index)) + 0.5;
      const open = viewport.priceToY(candle.open);
      const close = viewport.priceToY(candle.close);
      const high = viewport.priceToY(candle.high);
      const low = viewport.priceToY(candle.low);
      const rising = candle.close >= candle.open;
      const color = rising ? t.green : t.red;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, high);
      ctx.lineTo(x, low);
      ctx.stroke();
      ctx.fillRect(
        Math.round(x - solidWidth / 2),
        Math.round(Math.min(open, close)),
        solidWidth,
        Math.max(1, Math.round(Math.abs(close - open)))
      );
    });

    ctx.restore();
  };
}
