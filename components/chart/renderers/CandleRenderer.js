'use client';
export function CandleRenderer({ viewport, visibleCandles }) { return (ctx) => {
  const width = Math.max(1, Math.floor(viewport.state.barWidth * .68));
  // At very small zoom levels aggregate to vertical high/low strokes: this is
  // substantially cheaper than individual filled rectangles for 100k+ history.
  const dense = viewport.state.barWidth < 3;
  ctx.lineWidth = 1;
  visibleCandles.forEach(({ candle, index }) => {
    const x = Math.round(viewport.indexToX(index)) + .5; const open = viewport.priceToY(candle.open); const close = viewport.priceToY(candle.close); const high = viewport.priceToY(candle.high); const low = viewport.priceToY(candle.low); const rising = candle.close >= candle.open; const color = rising ? '#22C58B' : '#F0525F';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, high); ctx.lineTo(x, low); ctx.stroke();
    if (!dense) ctx.fillRect(Math.round(x - width / 2), Math.round(Math.min(open, close)), width, Math.max(1, Math.round(Math.abs(close - open))));
  });
}; }
