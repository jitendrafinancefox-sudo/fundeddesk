'use client';

function label(time, spanSeconds) {
  const date = new Date(time * 1000);
  if (spanSeconds > 20 * 3600) return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// Was entirely missing before — the pipeline never rendered any bottom
// time/date labels. Reuses the same transform every other renderer uses,
// so it always agrees with whatever candles are currently visible.
export function TimeAxisRenderer({ visibleCandles, transform, viewport }) {
  return (ctx) => {
    if (!visibleCandles?.length) return;
    const first = visibleCandles[0].candle.time;
    const last = visibleCandles[visibleCandles.length - 1].candle.time;
    const span = last - first;
    const targetLabels = 6;
    const step = Math.max(1, Math.floor(visibleCandles.length / targetLabels));

    ctx.save();
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#98A2B8';
    ctx.textAlign = 'center';
    for (let i = 0; i < visibleCandles.length; i += step) {
      const candle = visibleCandles[i].candle;
      const x = transform.timeToPixel(candle.time);
      if (x == null) continue;
      ctx.fillText(label(candle.time, span), x, viewport.state.height - 6);
    }
    ctx.restore();
  };
}
